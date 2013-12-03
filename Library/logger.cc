#include <iostream>
#include <fstream>
#include <cstdlib>
#include <sys/types.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <cctype>
#include <cstddef>
#include <execinfo.h>
#include <sys/socket.h>
#include <linux/socket.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <netdb.h>
#include <string.h>
#include <sys/time.h>
#include <cerrno>
#include <csignal>
#include <cxxabi.h>

#include "diagzilla.h"
#include "logger.h"

extern char *program_invocation_name;
extern char *program_invocation_short_name;

namespace DiagZilla {
using std::string;

static std::ofstream	*pDiagzillaOutStream = NULL;
static int dzSocket=0;
static bool connectServer();
static void sendServer(std::string &jsonStr);
static void disconnectServer();

static std::string escapeJsonString(const std::string& input)
{
	std::ostringstream ss;
	for (std::string::const_iterator iter = input.begin(); iter != input.end(); iter++) {
		switch (*iter) {
			case '"': ss << "\\\""; break;
			case '\\': ss << "\\\\"; break;
			case '/': ss << "\\/"; break;
			case '\b': ss << "\\b"; break;
			case '\f': ss << "\\f"; break;
			case '\n': ss << "\\n"; break;
			case '\r': ss << "\\r"; break;
			case '\t': ss << "\\t"; break;
			default: ss << *iter; break;
		}
	}
	return ss.str();
}

static std::string itos(int i)
{
	std::stringstream intbuf;
	intbuf << i;
	return intbuf.str();
}

static std::string ltos(long i)
{
	std::stringstream intbuf;
	intbuf << i;
	return intbuf.str();
}

static bool connectServer()
{
	int flag=1;
	struct sockaddr_in serv_addr;
	struct hostent *server;

	dzSocket = socket(AF_INET, SOCK_STREAM, 0);
	if(dzSocket < 0)
		fprintf(stderr, "Failed to create socket.\n");
	setsockopt(dzSocket, IPPROTO_TCP, TCP_NODELAY, (char*)&flag, sizeof(flag));
	flag=0;
	setsockopt(dzSocket, IPPROTO_TCP, TCP_CORK, (char*)&flag, sizeof(flag));

	server = gethostbyname("localhost");

	memset(&serv_addr, 0x00, sizeof(serv_addr));
	serv_addr.sin_family = AF_INET;
	memcpy(&serv_addr.sin_addr.s_addr, server->h_addr, server->h_length);
	serv_addr.sin_port = htons(7040);

	if(connect(dzSocket, (struct sockaddr *) &serv_addr, (socklen_t)sizeof(serv_addr)) < 0){
		fprintf(stderr, "DZ: Error while connecting to DiagZilla Server.\n");
		disconnectServer();
		return false;
	}

	::signal(SIGPIPE, SIG_IGN);

	std::string jsonStr;
	jsonStr = "{";
	jsonStr += "\"register\":true,";
	jsonStr += "\"execName\":\"" + escapeJsonString(std::string(program_invocation_name)) + "\",";
	jsonStr += "\"shortName\":\"" + escapeJsonString(std::string(program_invocation_short_name)) + "\",";
	jsonStr += "\"pid\":" + escapeJsonString(itos(getpid()));
	jsonStr += "}";
	
	sendServer(jsonStr);

	return true;
}

static void sendServer(std::string &jsonStr)
{
	if(!dzSocket){if(!connectServer()) return;}

	uint32_t buflen;
	uint32_t nbuflen;

	buflen = jsonStr.length();
	nbuflen = ::htonl(buflen);

	if(::send(dzSocket, &nbuflen, sizeof(nbuflen), MSG_MORE) == -1) goto err;
	if(::send(dzSocket, jsonStr.data(), buflen, MSG_EOR) == -1) goto err;

	return;

err:
	disconnectServer();
	return;
}

static void disconnectServer()
{
	if(dzSocket!=0){
		close(dzSocket);
		dzSocket=0;
		::signal(SIGPIPE, SIG_DFL);
	}
}


LogChannel trace(std::clog, "T");
LogChannel verbose(std::clog, "V");
LogChannel debug(std::clog, "D");
LogChannel info(std::clog, "I");
LogChannel warn(std::clog, "W");
LogChannel error(std::clog, "E");
LogChannel fatal(std::clog, "F");
LogChannel assert(std::clog, "A");

void init()
{
	char *outFile;

	outFile = getenv("DIAGZILLA_OUT_FILE");

	if(outFile){
		pDiagzillaOutStream = new std::ofstream();
		pDiagzillaOutStream->open(outFile, std::ios_base::app);
	}

	connectServer();
}

void finish()
{
	if(pDiagzillaOutStream && pDiagzillaOutStream->is_open())
		pDiagzillaOutStream->close();
	disconnectServer();
}

static pid_t gettid(void)
{
	return syscall(SYS_gettid);
}

LogChannel::LogChannel(std::string type):
	mOutChannel(std::clog),
	mTimestamp(0),
	mType(type)
{
	init();
}

LogChannel::LogChannel(std::ostream &outstream, std::string type):
	mOutChannel(outstream),
	mTimestamp(0),
	mType(type)
{
	init();
}

LogChannel::~LogChannel()
{
}

LogChannel &LogChannel::printf(const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	vprintf(fmt, ap);
	va_end(ap);
	return *this;
}

LogChannel &LogChannel::vprintf(const char *fmt, va_list ap)
{
	mFormatStr = fmt;
	va_copy(mInitAp, ap);

	string fmtStr(fmt);
	size_t posBegin=0, posEnd=0;

	posBegin=0;
	do {
		posEnd = fmtStr.find_first_of("%", posBegin);
		*this << fmtStr.substr(posBegin, posEnd-posBegin);
		if(posEnd != string::npos) {
			string fmtToken;
			posBegin = posEnd;
			posEnd = fmtStr.find_first_of("diouxXeEfFgGaAcspnm%", posBegin+1);
			fmtToken = fmtStr.substr(posBegin, posEnd-posBegin+1);
			posBegin = posEnd+1;
			handleFmtToken(fmtToken, ap);
		}
	} while(posEnd != string::npos);


	return *this;
}

LogChannel &LogChannel::setPosition(const char *filename,
		const int line, const char *function, const char *pfunction)
{
	struct timeval time;
	if(gettimeofday(&time, NULL)==0) mTimestamp = (time.tv_sec*1000) + (time.tv_usec/1000);
	mPosition.setPosition(filename, line, function, pfunction, mType=="T");

	return *this;
}

LogChannel &LogChannel::dump(const void *p, const size_t siz)
{
	size_t i;
	int remain=0;
	unsigned char *cur;

	for(i=0, cur=(unsigned char*)p;i<siz;++i) {
		remain=i%16;
		if(!remain) printf("%p : ", (void*)(cur+i));

		printf("%02x ", cur[i]);

		if(remain>=15 || i>=(siz-1)) {
			printf(" ");
			if(i>=(siz-1)){
				printf("%*s", (15-remain)*3, "");
			}
			do {
				printf("%c", isprint(cur[i-remain])?cur[i-remain]:'.');
			} while(remain--);
			flush();
		}
	}

	return *this;
}



void LogChannel::flush()
{
//	mOutChannel << "[" << mTimestamp << "]:";
//	mOutChannel << mType << ":";
//	mOutChannel << "[" << getpid() << ":" << gettid() << "]";
//	mOutChannel << mPosition.str();

//	mOutChannel << str();
//	mOutChannel << std::endl;

	if(pDiagzillaOutStream && pDiagzillaOutStream->is_open()){
		(*pDiagzillaOutStream) << "[" << mTimestamp << "]:";
		(*pDiagzillaOutStream) << mType << ":";
		(*pDiagzillaOutStream) << "[" << getpid() << ":" << gettid() << "]";
		(*pDiagzillaOutStream) << mPosition.str();

		(*pDiagzillaOutStream) << str();
		(*pDiagzillaOutStream) << std::endl;
	}

	std::string jsonStr;
	jsonStr = "{";
	jsonStr += "\"timestamp\":" + escapeJsonString(ltos(mTimestamp)) + ",";
	jsonStr += "\"type\":\"" + escapeJsonString(mType) + "\",";
	jsonStr += "\"tid\":" + escapeJsonString(itos(gettid())) + ",";
	jsonStr += "\"position\": " + mPosition.JSON() + ",";
	jsonStr += "\"message\" : \"" + escapeJsonString(str()) + "\"";
	jsonStr += "}";

	sendServer(jsonStr);

	str(string());
	clear();
	base::flush();
}

int LogChannel::va_argn(unsigned int i)
{
	va_list ap;
	va_copy(ap, mInitAp);
	while(--i) va_arg(ap, int);
	return va_arg(ap, int);
}

bool LogChannel::isFlagFormat(const char ch)
{
	const static string flagFmtChars("#0- +");
	return flagFmtChars.find(ch)!=string::npos;
}

int LogChannel::getFieldWidthPrecision(string::iterator &i, const va_list ap)
{
	string fmt;
	char ch=*i;
	bool reference=false;
	bool minus=false;
	int number=0;

	if(isdigit(ch) || ch=='*' || ch=='-') {
		do {
			fmt += *i;
		} while(isdigit(*(++i)));
		ch = *i;
		if(ch=='$'){
			fmt += ch;
			ch = *(++i);
		}
	}

	ch = *fmt.begin();
	if(ch=='*')			reference = true;
	else if(ch=='-')	minus = true;

	if(reference || minus)
		fmt.erase(fmt.begin());

	number = atoi(fmt.c_str());
	if(reference) {
		if(number==0) return va_arg(ap, int);
		else return va_argn(number);
	}

	number *= minus?-1:1;

	return number;
}

string LogChannel::getLengthModifier(string::iterator &i)
{
	string lengthModifier;
	char ch		= *i;
	char nch	= *(i+1);

	if(ch=='h' || ch=='l' || ch=='L'|| ch=='j'|| ch=='z'|| ch=='t'){
		lengthModifier=ch;
		++i;
		if((ch=='h' || ch=='l') && ch==nch){
			lengthModifier+=nch;
			++i;
		}
	}
	return lengthModifier;
}

void LogChannel::handleFmtToken(string fmt, const va_list ap)
{
	string::iterator i=fmt.begin();
	const string::iterator e=fmt.end()-1;
	string fmtFlags;
	string fmtLengthModifier;
	int fieldwidth=0;
	int precisionVal=1;
	std::ios_base::fmtflags fmtflags = flags();

	// flags
	for(char ch=*(++i);i!=e && isFlagFormat(ch);ch=*(++i)) 
		fmtFlags += ch;

	// field width
	fieldwidth = getFieldWidthPrecision(i, ap);

	// precision
	if(*i=='.') precisionVal = getFieldWidthPrecision(++i, ap);

	// length modifier
	fmtLengthModifier = getLengthModifier(i);

	if(!fmtFlags.empty()) {
		if(fmtFlags.find('#')!=string::npos)
			setf(std::ios_base::showbase);
		if(fmtFlags.find('-')!=string::npos)
			setf(std::ios_base::left, std::ios_base::adjustfield);
		else if(fmtFlags.find('0')!=string::npos)
			fill('0');
		if(fmtFlags.find(' ')!=string::npos)
			fill(' ');
		if(fmtFlags.find('+')!=string::npos)
			setf(std::ios_base::right, std::ios_base::adjustfield);
	}

	if(fieldwidth)		width(fieldwidth);
	if(precisionVal!=1)	precision(precisionVal);
	switch(*i) {
		case 'd':
		case 'i':
			if(fmtLengthModifier.empty())
				*this << va_arg(ap, int);
			else if(fmtLengthModifier=="hh")
				*this << (int)((char)va_arg(ap, int));
			else if(fmtLengthModifier=="h")
				*this << (int)((short)va_arg(ap, int));
			else if(fmtLengthModifier=="l")
				*this << va_arg(ap, long);
			else if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else if(fmtLengthModifier=="z")
				*this << va_arg(ap, ssize_t);
			else if(fmtLengthModifier=="t")
				*this << va_arg(ap, ptrdiff_t);
			else
				*this << va_arg(ap, int);
			break;
		case 'o':
		setf(std::ios_base::oct, std::ios_base::basefield);
		if(fmtLengthModifier.empty())
				*this << va_arg(ap, unsigned int);
			else if(fmtLengthModifier=="hh")
				*this << (unsigned int)((unsigned char)va_arg(ap, unsigned int));
			else if(fmtLengthModifier=="h")
				*this << (unsigned int)((unsigned short)va_arg(ap, unsigned int));
			else if(fmtLengthModifier=="l")
				*this << va_arg(ap, unsigned long);
			else if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else if(fmtLengthModifier=="z")
				*this << va_arg(ap, size_t);
			else if(fmtLengthModifier=="t")
				*this << va_arg(ap, ptrdiff_t);
			else
				*this << va_arg(ap, unsigned int);
			break;
		case 'u':
			setf(std::ios_base::dec, std::ios_base::basefield);
			if(fmtLengthModifier.empty())
				*this << va_arg(ap, unsigned int);
			else if(fmtLengthModifier=="hh")
				*this << (unsigned int)((unsigned char)va_arg(ap, unsigned int));
			else if(fmtLengthModifier=="h")
				*this << (unsigned int)((unsigned short)va_arg(ap, unsigned int));
			else if(fmtLengthModifier=="l")
				*this << va_arg(ap, unsigned long);
			else if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else if(fmtLengthModifier=="z")
				*this << va_arg(ap, size_t);
			else if(fmtLengthModifier=="t")
				*this << va_arg(ap, ptrdiff_t);
			else
				*this << va_arg(ap, unsigned int);
			break;
		case 'X':
			setf(std::ios_base::uppercase);
			// let through
		case 'x':
			setf(std::ios_base::hex, std::ios_base::basefield);
			if(fmtLengthModifier.empty())
				*this << va_arg(ap, unsigned int);
			else if(fmtLengthModifier=="hh")
				*this << (unsigned int)((unsigned char)va_arg(ap, unsigned int));
			else if(fmtLengthModifier=="h")
				*this << (unsigned int)((unsigned short)va_arg(ap, unsigned int));
			else if(fmtLengthModifier=="l")
				*this << va_arg(ap, unsigned long);
			else if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else if(fmtLengthModifier=="z")
				*this << va_arg(ap, size_t);
			else if(fmtLengthModifier=="t")
				*this << va_arg(ap, ptrdiff_t);
			else
				*this << va_arg(ap, unsigned int);
			break;
		case 'E':
			setf(std::ios_base::uppercase);
			// let through
		case 'e':
			setf(std::ios_base::scientific, std::ios_base::floatfield);
			if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else
				*this << va_arg(ap, double);
			break;
		case 'F':
			setf(std::ios_base::uppercase);
			// let through
		case 'f':
			setf(std::ios_base::fixed, std::ios_base::floatfield);
			if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else
				*this << va_arg(ap, double);
			break;
		case 'G':
			setf(std::ios_base::uppercase);
			// let through
		case 'g':
			setf(std::ios_base::scientific|std::ios_base::fixed, std::ios_base::floatfield);
			if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else
				*this << va_arg(ap, double);
			break;
		case 'A':
			setf(std::ios_base::uppercase);
			// let through
		case 'a':
			setf(std::ios_base::hex|std::ios_base::scientific|std::ios_base::fixed, std::ios_base::basefield|std::ios_base::floatfield);
			if(fmtLengthModifier=="L")
				*this << va_arg(ap, long double);
			else
				*this << va_arg(ap, double);
			break;
		case 'c':
			*this << static_cast<char>(va_arg(ap, int));
			break;
		case 's':
			fill(' ');
			*this << va_arg(ap, char*);
			break;
		case 'p':
			setf(std::ios_base::showbase);
			*this << va_arg(ap, void*);
			break;
		case '%':
			*this << '%';
			break;
		default:
			*this << "< " << va_arg(ap, void*) << ">";
			break;
	}
	flags(fmtflags);

	return;
}

void LogChannel::init()
{
	*this << std::boolalpha;
}

LogChannel::PositionInfo::PositionInfo():
	mFilename(),
	mLine(0),
	mFunction()
{
}

LogChannel::PositionInfo::~PositionInfo()
{
}

void LogChannel::PositionInfo::setPosition(const char* filename, const int line, const char *function, const char *pfunction, const bool dumpStackSymbol)
{
	size_t	i=0;
	std::string tmpstr;

	tmpstr = filename;
	i = tmpstr.find_last_of("/");
	if(i==std::string::npos)
		mFilename = tmpstr;
	else {
		tmpstr.substr(0, i);//	--> Path
		mFilename = tmpstr.substr(i+1);
	}

	mLine = line;

	mFunction = function;
	mPrettyFunction = pfunction;

	mStackDepth=backtrace(mStackAddresses, (sizeof(mStackAddresses)/sizeof(void*)));

	static const size_t skippedFrameDepth = 3;
	static const size_t stackInvestDepthDefault = 5;

	mStackDepth-=skippedFrameDepth;

	size_t stackInvestDepth = mStackDepth>stackInvestDepthDefault?stackInvestDepthDefault:mStackDepth;
	mStackSymbols.clear();
	i=0;

	char **symbols = NULL;
	if(dumpStackSymbol && (symbols = backtrace_symbols(mStackAddresses+skippedFrameDepth, stackInvestDepth))!=NULL){
		for(i=0;i<stackInvestDepth;++i)
			mStackSymbols.push_back(
				std::string("[")+ptos(mStackAddresses[i+skippedFrameDepth])+std::string("] ") + symbols[i]);
		free(symbols);
	}
	for((void)i;i<mStackDepth;++i)
		mStackSymbols.push_back(
			std::string("[")+ptos(mStackAddresses[i+skippedFrameDepth])+std::string("] "));
}

std::string LogChannel::PositionInfo::str()
{
	std::string filenameStr;
	std::string functionStr;
	std::string lineStr;
	std::string stackDepthStr;

	filenameStr = mFilename;
	filenameStr.resize(25, ' ');

	functionStr = mFunction;
	functionStr.resize(40, ' ');

	lineStr = itos(mLine);
	lineStr.resize(6, ' ');

	stackDepthStr = itos(mStackDepth);

	std::string locStr;

	locStr += std::string("[") + filenameStr;
	locStr += std::string("][") + lineStr;
	locStr += std::string("][") + functionStr;
	locStr += std::string("][") + stackDepthStr + std::string("]");

	return locStr;
}

std::string LogChannel::PositionInfo::JSON()
{
	std::string buf;
	std::string lineStr;
	std::string stackDepthStr;

	lineStr = itos(mLine);
	stackDepthStr = itos(mStackDepth);

	buf = "{";
	buf += "\"filename\":\"" + escapeJsonString(mFilename) + "\",";
	buf += "\"line\":" + escapeJsonString(lineStr) + ",";
	buf += "\"function\":\"" + escapeJsonString(mFunction) + "\",";
	buf += "\"prettyfunction\":\"" + escapeJsonString(mPrettyFunction) + "\",";
	buf += "\"stackdepth\":" + escapeJsonString(stackDepthStr) + ",";
	buf += "\"stack\":[";
	/*
	for(size_t i=2;i<mStackDepth+2;++i){
		if(i!=2) buf+=",";
		buf += "\""+ptos(static_cast<const void*>(mStackAddresses[i]))+"\"";
	}
	*/
	for(StackSymbolList_t::iterator i=mStackSymbols.begin();i!=mStackSymbols.end();++i){
		if(i!=mStackSymbols.begin()) buf+=",";
		buf += "\"" + *i + "\"";
	}
	buf += "]";
	buf += "}";

	return buf;
}

std::string LogChannel::PositionInfo::ptos(const void *p)
{
	std::stringstream intbuf;
	intbuf << p;
	return intbuf.str();
}

std::string LogChannel::PositionInfo::itos(const int i)
{
	std::stringstream intbuf;
	intbuf << i;
	return intbuf.str();
}

} // namespace DiagZilla 

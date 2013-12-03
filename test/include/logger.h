#ifndef __LOGGER__
#define __LOGGER__
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <cstdarg>

namespace DiagZilla {

void init();
void finish();

class LogChannel : public std::ostringstream {
	typedef std::ostringstream base;
	private:
		class PositionInfo {
			typedef std::vector<std::string> StackSymbolList_t;
			public:
				PositionInfo();
				~PositionInfo();
				void setPosition(const char* filename, const int line, const char *function, const char *pfunction, const bool dumpStackSymbol=false);
				std::string str();
				std::string JSON();
			private:
				std::string ptos(const void *p);
				std::string itos(const int i);
			private:
				std::string			mPath;
				std::string			mFilename;
				unsigned int		mLine;
				std::string			mFunction;
				std::string			mPrettyFunction;
				void				*mStackAddresses[100];
				size_t				mStackDepth;
				StackSymbolList_t	mStackSymbols;
		};
	public:
		explicit LogChannel(std::string type);
		explicit LogChannel(std::ostream &outstream, std::string type);
		~LogChannel();
		LogChannel &printf(const char *fmt, ...);
		LogChannel &vprintf(const char *fmt, va_list ap);
		LogChannel &setPosition(const char *filename, const int line, const char *function, const char *pfunction);
		LogChannel &dump(const void *p, const size_t siz);
		void flush();

		friend void init();
		friend void finish();
	protected:
		explicit	LogChannel():mOutChannel(std::clog){init();};
		int			va_argn(unsigned int i);
		bool		isFlagFormat(const char ch);
		int			getFieldWidthPrecision(std::string::iterator &i, const va_list ap);
		std::string getLengthModifier(std::string::iterator &i);
		void		handleFmtToken(std::string fmt, const va_list ap);
	private:
		void		init();

	protected:
		std::ostream	&mOutChannel;

	private:
		unsigned long	mTimestamp;
		std::string		mType;
		std::string		mFormatStr;
		va_list			mInitAp;
		PositionInfo	mPosition;

};

}	// namespace DiagZilla
#endif		// __LOGGER__

#include <iostream>
#include <cstdlib>
#include <unistd.h>

//#define DZ_DISABLE_ALL
//#define DZ_DISABLE_TRACE
//#define DZ_DISABLE_VERBOSE
//#define DZ_DISABLE_DEBUG
//#define DZ_DISABLE_INFO
//#define DZ_DISABLE_WARN
//#define DZ_DISABLE_ERROR
//#define DZ_DISABLE_FATAL
//#define DZ_DISABLE_ASSERT
//#define DZ_DISABLE_DUMP
#include "diagzilla.h"

int cnt=10;
int i;
int width = 2;
int width2 = 10;
int num = 100;
int num2 = 101;
const char *str = "Hello, world!";
float f = 1.2;
unsigned int repeat = 100;


void foo()
{
	do {
		std::cout << "DiagZilla test for CPP." << std::endl;

		DZ_TRACE("format string only");
		DZ_TRACE("string -> " << "Hello, world!");
		DZ_TRACE(128);
		DZ_VERBOSE("width : " << width << ", " << &width << " %%");
		DZ_DEBUG("%*d" << width << num << num2);
		DZ_INFO("width : %d, width2 : %d, num : %d, num2 : %d --> %*4$.*2$d" <<  width << width2 << num << num2 << 1010);
		DZ_WARN("%*s<EOS>" << width+width2 << str);
		DZ_ERROR("%-*2$s<EOS>" << str << width+width2);
		DZ_FATAL("%-20s<EOS>" << str);
		DZ_TRACE("%.5d" << num);
		DZ_TRACE("%.5f" << f);
		DZ_TRACE("%.5s" << str);

		DZ_DUMP(str, 38);

		usleep(300);
	} while(cnt--);
}

int main(int argc, char *argv[])
{
	while(repeat--)
	{
	std::cout << repeat << " : DiagZilla test for CPP." << std::endl;

	DZ_TRACE("DiagZilla test for CPP begin. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line.");
	DZ_TRACE(repeat << " : DiagZilla test for CPP begin.");
//	foo();
	DZ_TRACE("format string only");
	DZ_TRACE("string -> " << "Hello, world!");
	for(i=0;i<argc;++i) {
		DZ_TRACE(argc << " : " << argv[i]);
	}

	DZ_VERBOSE(128);
	DZ_DEBUG("width : " << width);
	DZ_INFO(str);
	DZ_WARN(num);
	DZ_ERROR(f);
	DZ_FATAL("Fatal...");

	DZ_ASSERT(0);
	DZ_DUMP(str, 38);

//	usleep(800000);
	}

	return EXIT_SUCCESS;
}

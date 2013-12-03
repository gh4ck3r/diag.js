#include <stdio.h>
#include <stdlib.h>
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
unsigned int repeat = 1000;

void foo()
{
	do {
		printf("DiagZilla test for C.\n");

		dz_trace("format string only");
		dz_trace("string -> %s", "Hello, world!");
		dz_trace("trace : %hhd\n", 127);
		dz_verbose("verbose : %hhd\n", 128);
		dz_debug("debug : width : %010d, %p, %%", width, &width);
		dz_info("info : %*d", width, num, num2);
		dz_warn("warn : width : %d, width2 : %d, num : %d, num2 : %d --> %*4$.*2$d", width, width2, num, num2, 1010);
		dz_error("error : %*s<EOS>", width+width2, str);
		dz_fatal("fatal : %-*2$s<EOS>", str, width+width2);
		dz_trace("%-20s<EOS>", str);
		dz_trace("%.5d", num);
		dz_trace("%.5f", f);
		dz_trace("%.5s", str);
		
		dz_dump(str, 38);

		usleep(300);
	} while(cnt--);
}

int main(int argc, char *argv[])
{
	while(repeat--) {

	printf("%d : DiagZilla test for C begin.\n", repeat);

	dz_trace("DiagZilla test for CPP begin. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line. very very long long line.");
	dz_trace("%d : DiagZilla test for C begin.", repeat);
//	foo();
	dz_trace("format string only");
	dz_trace("string -> %s ", "Hello, world!");
	for(i=0;i<argc;++i) {
		dz_trace("%d : %s", argc, argv[i]);
	}

	dz_verbose("%d", 128);
	dz_debug("width : %d", width);
	dz_info("%s", str);
	dz_warn("%d", num);
	dz_error("%f", f);
	dz_fatal("Fatal...");

	dz_assert(0);
	dz_dump(str, 38);

//	usleep(20000);
	}

	return EXIT_SUCCESS;
}

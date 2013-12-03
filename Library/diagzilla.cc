#include <iostream>
#include <sstream>
#include <cstdarg>
#include <cctype>
#include <cstdlib>

#include "_diagzilla.h"
#include "logger.h"

static void __attribute__((constructor)) dz_init(void)
{
	DiagZilla::init();
}

static void __attribute__((destructor)) dz_destroy(void)
{
	DiagZilla::finish();
}

void _dz_trace(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;

	va_start(ap, fmt);
	DiagZilla::trace.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_verbose(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	DiagZilla::verbose.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_debug(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	DiagZilla::debug.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_info(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	DiagZilla::info.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_warn(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	DiagZilla::warn.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_error(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	DiagZilla::error.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_fatal(const char *filename, const int line, const char *function, const char *pfunction, const char *fmt, ...)
{
	va_list ap;
	va_start(ap, fmt);
	DiagZilla::fatal.setPosition(filename, line, function, pfunction)
		.vprintf(fmt, ap).flush();
	va_end(ap);
}

void _dz_assert(const char *filename, const int line, const char *function, const char *pfunction, const char *condition)
{
	DiagZilla::assert.setPosition(filename, line, function, pfunction)
		.printf("Assertion '%s' is failed", condition).flush();
}

void _dz_dump(const char *filename, const int line, const char *function, const char *pfunction, const void *p, const size_t siz)
{
	DiagZilla::verbose.setPosition(filename, line, function, pfunction)
		.dump(p, siz);
}


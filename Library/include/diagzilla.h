#ifndef __DIAGZILLA_H__
#define __DIAGZILLA_H__

/** Template for include header
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
*/

#define _NULL_STMT()	do{}while(0)

#if !defined(DZ_DISABLE_ALL) &&	\
	!(defined(DZ_DISABLE_TRACE)		\
		&& defined(DZ_DISABLE_VERBOSE)	\
		&& defined(DZ_DISABLE_DEBUG)	\
		&& defined(DZ_DISABLE_INFO)		\
		&& defined(DZ_DISABLE_WARN)		\
		&& defined(DZ_DISABLE_ERROR)	\
		&& defined(DZ_DISABLE_FATAL)	\
		&& defined(DZ_DISABLE_ASSERT)	\
		&& defined(DZ_DISABLE_DUMP))
#include "_diagzilla.h"
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_TRACE)
#ifdef dz_trace
#undef dz_trace
#endif
#ifdef DZ_TRACE
#undef DZ_TRACE
#endif
#define dz_trace(fmt, args...)		_NULL_STMT()
#define DZ_TRACE(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_VERBOSE)
#ifdef dz_verbose
#undef dz_verbose
#endif
#ifdef DZ_VERBOSE
#undef DZ_VERBOSE
#endif
#define dz_verbose(fmt, args...)	_NULL_STMT()
#define DZ_VERBOSE(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_DEBUG)
#ifdef dz_debug
#undef dz_debug
#endif
#ifdef DZ_DEBUG
#undef DZ_DEBUG
#endif
#define dz_debug(fmt, args...) 		_NULL_STMT()
#define DZ_DEBUG(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_INFO)
#ifdef dz_info
#undef dz_info
#endif
#ifdef DZ_INFO
#undef DZ_INFO
#endif
#define dz_info(fmt, args...)		_NULL_STMT()
#define DZ_INFO(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_WARN)
#ifdef dz_warn
#undef dz_wran
#endif
#ifdef DZ_WARN
#undef DZ_WRAN
#endif
#define dz_warn(fmt, args...)		_NULL_STMT()
#define DZ_WARN(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_ERROR)
#ifdef dz_error
#undef dz_error
#endif
#ifdef DZ_ERROR
#undef DZ_ERROR
#endif
#define dz_error(fmt, args...)		_NULL_STMT()
#define DZ_ERROR(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_FATAL)
#ifdef dz_fatal
#undef dz_fatal
#endif
#ifdef DZ_FATAL
#undef DZ_FATAL
#endif
#define dz_fatal(fmt, args...)		_NULL_STMT()
#define DZ_FATAL(...)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_ASSERT)
#ifdef dz_assert
#undef dz_assert
#endif
#ifdef DZ_ASSERT
#undef DZ_ASSERT
#endif
#define dz_assert(condition)		_NULL_STMT()
#define DZ_ASSERT(cond)				_NULL_STMT()
#endif

#if defined(DZ_DISABLE_ALL) || defined(DZ_DISABLE_DUMP)
#ifdef dz_dump
#undef dz_dump
#endif
#ifdef DZ_DUMP
#undef DZ_DUMP
#endif
#define dz_dump(ptr, siz)			_NULL_STMT()
#define DZ_DUMP(ptr, siz) 			_NULL_STMT()
#endif

#endif	// __DIAGZILLA_H__

#ifndef ___DIAGZILLA_H__
#define ___DIAGZILLA_H__

#define _DZ_MSG_COMMON_ARG_TYPES const char *, const int , const char *, const char *
#define _DZ_MSG_COMMON_ARGS	__FILE__, __LINE__, __FUNCTION__, __PRETTY_FUNCTION__

#ifdef __cplusplus
extern "C" {
#endif	// __cplusplus

void _dz_trace(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_verbose(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_debug(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_info(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_warn(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_error(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_fatal(_DZ_MSG_COMMON_ARG_TYPES, const char*, ...);
void _dz_assert(_DZ_MSG_COMMON_ARG_TYPES, const char*);
void _dz_dump(_DZ_MSG_COMMON_ARG_TYPES, const void *p, const size_t siz);

#ifdef __cplusplus
}
#endif	// __cplusplus

#ifndef __CLASS__
#define __CLASS__ NULL
#endif	// __CLASS__

#define dz_trace(fmt, args...)		do{_dz_trace(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)
#define dz_verbose(fmt, args...)	do{_dz_verbose(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)
#define dz_debug(fmt, args...)	 	do{_dz_debug(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)
#define dz_info(fmt, args...)		do{_dz_info(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)
#define dz_warn(fmt, args...)		do{_dz_warn(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)
#define dz_error(fmt, args...)		do{_dz_error(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)
#define dz_fatal(fmt, args...)		do{_dz_fatal(	_DZ_MSG_COMMON_ARGS, fmt, ## args);}while(0)

#define dz_assert(condition)		do{if(!(condition))_dz_assert(_DZ_MSG_COMMON_ARGS, #condition);}while(0)
#define dz_dump(ptr, siz)			do{_dz_dump(	_DZ_MSG_COMMON_ARGS, (void*)ptr, siz);}while(0)

#ifdef __cplusplus
#include "logger.h"
namespace DiagZilla {
extern LogChannel trace;
extern LogChannel verbose;
extern LogChannel debug;
extern LogChannel info;
extern LogChannel warn;
extern LogChannel error;
extern LogChannel fatal;
extern LogChannel assert;
}

#define _DZ_TEMPLATE(channel, ...)											\
	do{																		\
		DiagZilla::channel.setPosition(_DZ_MSG_COMMON_ARGS) << __VA_ARGS__;	\
		DiagZilla::channel.flush();											\
	}while(0)

#define DZ_TRACE(...)	_DZ_TEMPLATE(trace, __VA_ARGS__)
#define DZ_VERBOSE(...)	_DZ_TEMPLATE(verbose,__VA_ARGS__)
#define DZ_DEBUG(...)	_DZ_TEMPLATE(debug,__VA_ARGS__)
#define DZ_INFO(...)	_DZ_TEMPLATE(info,__VA_ARGS__)
#define DZ_WARN(...)	_DZ_TEMPLATE(warn,__VA_ARGS__)
#define DZ_ERROR(...)	_DZ_TEMPLATE(error,__VA_ARGS__)
#define DZ_FATAL(...)	_DZ_TEMPLATE(fatal,__VA_ARGS__)

#define DZ_ASSERT(cond)	dz_assert(cond)
#define DZ_DUMP(ptr, siz) dz_dump(ptr, siz)
#endif	// __cplusplus


#endif	// ___DIAGGZILLA_H__

CXX	:= g++
LD	:= g++
AR	:= ar

TOP_DIR		:= $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)
CUR_DIR		:= $(abspath $(dir $(firstword $(MAKEFILE_LIST))))

SRCS	:=	diagzilla.cc		\
			logger.cc
SRS	:= $(addprefix $(CUR_DIR)/,$(SRCS))

INCLUDES	:= $(CUR_DIR)/include

OBJ_DIR	:= $(CUR_DIR)/.obj

TARGET_LIB	:= $(OBJ_DIR)/libDiagZilla.a
TARGET_SO	:= $(TARGET_LIB:.a=.so)

CXXFLAGS	:= -MD -g -c -m64 -pipe -fPIC -W -Wall $(addprefix -I,$(INCLUDES))
LFLAGS		:= -W -Wall -shared -W1-soname,$(TARGET_SO) -o $(TARGET_SO)
ARFLAGS		:= rcs#v

ECHO	:= echo
MKDIR	:= mkdir -p
RM		:= rm -rf
INSTALL	:= install -p

OBJS	:= $(addprefix $(OBJ_DIR)/, $(SRCS:.cc=.o)) $(addprefix $(OBJ_DIR)/, $(SRCS_OPT:.cc=.o))

.PHONY: all
all: $(TARGET_SO)

$(TARGET_LIB): $(OBJS)
	@$(ECHO) "Creating library \"$(notdir $@)\""
	@$(AR) $(ARFLAGS) $@ $?

$(TARGET_SO): $(OBJS)
	@$(ECHO) "Creating shared library \"$(notdir $@)\""
	@$(LD) $(LFLAGS) $^

vpath %.cc $(CUR_DIR)
$(OBJ_DIR)/%.o: %.cc
	@if [ ! -d $(dir $@) ];then $(MKDIR) $(dir $@);fi
	@$(ECHO) "Compile $(notdir $@)"
	@$(CXX) $(CXXFLAGS) $< -o $@

################################################################################
# Installation part
################################################################################
.PHONY:  install


HEADERS				:= diagzilla.h _diagzilla.h logger.h
EXPORT_INCLUDE_DIR	:= $(INCLUDES)
EXPORT_HEADERS		:= $(addprefix $(EXPORT_INCLUDE_DIR)/,$(HEADERS))

INSTALL_TARGET_DIR	?= $(TOP_DIR)/test
INSTALL_HEADER_DIR	:= $(INSTALL_TARGET_DIR)/include
INSTALL_LIB_DIR		:= $(INSTALL_TARGET_DIR)/lib

TARGET_LIBS			:= $(TARGET_SO)
INSTALL_LIBS		:= $(addprefix $(INSTALL_LIB_DIR)/,$(notdir $(TARGET_LIBS)))
INSTALL_HEADERS		:= $(addprefix $(INSTALL_HEADER_DIR)/,$(notdir $(EXPORT_HEADERS)))

INSTALL_TARGETS		:= $(INSTALL_HEADERS) $(INSTALL_LIBS)

install: $(INSTALL_TARGETS)
isis:
	@INSTALL_TARGET_DIR=/home/changbin.park/work/WebOS/isis/staging $(MAKE) install

$(INSTALL_LIB_DIR)/$(notdir $(TARGET_LIB)): $(TARGET_LIB)
	@if [ ! -d $(dir $@) ];then $(MKDIR) $(dir $@);fi
	@$(ECHO) "Install '$(notdir $<)' --> $(dir $@)"
	@$(INSTALL) -m644 $< $@

$(INSTALL_LIB_DIR)/$(notdir $(TARGET_SO)): $(TARGET_SO)
	@if [ ! -d $(dir $@) ];then $(MKDIR) $(dir $@);fi
	@$(ECHO) "Install '$(notdir $<)' --> $(dir $@)"
	@$(INSTALL) -m644 $< $@


vpath %.h $(EXPORT_INCLUDE_DIR)
$(INSTALL_HEADER_DIR)/%.h: %.h
	@if [ ! -d $(dir $@) ];then $(MKDIR) $(dir $@);fi
	@$(ECHO) "Install '$(notdir $<)' --> $(dir $@)"
	@$(INSTALL) -m644 $< $@

################################################################################
# Common Targets
################################################################################
.PHONY: clean distclean cleanall
clean:
	-@$(RM) $(OBJ_DIR)
	-@$(RM) $(TARGET_LIB)
	-@$(RM) $(TARGET_SO)

distclean:
	-@$(RM) $(INSTALL_HEADERS)
	-@$(RM) $(INSTALL_LIBS)
	-@if [ ! "$(ls -A $(INSTALL_HEADER_DIR))" ];then $(RM) $(INSTALL_HEADER_DIR);fi
	-@if [ ! "$(ls -A $(INSTALL_LIB_DIR))" ];then $(RM) $(INSTALL_LIB_DIR);fi

cleanall: clean distclean

-include $(OBJ_DIR)/*.d

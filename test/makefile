TOP_DIR		:= $(abspath $(dir $(lastword $(MAKEFILE_LIST)))/..)
CUR_DIR		:= $(abspath $(dir $(firstword $(MAKEFILE_LIST))))

C_SRC := $(CUR_DIR)/test.c
C_OBJDIR := $(CUR_DIR)/.cobj
C_OBJS := $(addprefix $(C_OBJDIR)/, $(notdir $(C_SRC:.c=.o)))
C_TARGET := $(CUR_DIR)/ctest

CPP_SRC := $(CUR_DIR)/test.cpp
CPP_OBJDIR := $(CUR_DIR)/.cppobj
CPP_OBJS := $(addprefix $(CPP_OBJDIR)/, $(notdir $(CPP_SRC:.cpp=.o)))
CPP_TARGET := $(CUR_DIR)/cpptest

INCLUDE	:= $(CUR_DIR)/include

CC		:= gcc
CFLAGS	:= -g -MD -c -m64 -pipe -W -Wall $(addprefix -I, $(INCLUDE)) -rdynamic
C_LD	:= gcc

CXX			:= g++
CXXFLAGS	:= -g -MD -c -m64 -pipe -W -Wall $(addprefix -I, $(INCLUDE)) -rdynamic
CXX_LD		:= g++

LIB_DIR	:= $(CUR_DIR)/lib
LIBS	:= DiagZilla stdc++
LFLAGS	:= -W -Wall -rdynamic -L$(LIB_DIR)

MKDIR	:= mkdir -p
RM		:= rm -rf
ECHO	:= echo

.PHONY: all test ctest cpptest

all: $(C_TARGET) $(CPP_TARGET)

test: ctest cpptest

ctest: $(C_TARGET)
	@$(ECHO) 
	@$(ECHO) "================================================================================"
	@$(ECHO) " Running C test."
	@$(ECHO) "--------------------------------------------------------------------------------"
	@env LD_LIBRARY_PATH=$(LIB_DIR) $<
	@$(ECHO) "================================================================================"

cpptest: $(CPP_TARGET)
	@$(ECHO) 
	@$(ECHO) "================================================================================"
	@$(ECHO) " Running CPP test."
	@$(ECHO) "--------------------------------------------------------------------------------"
	@env LD_LIBRARY_PATH=$(LIB_DIR) $<
	@$(ECHO) "================================================================================"

$(C_TARGET): $(C_OBJS)
	@$(ECHO) "Link $(notdir $^)"
	@$(C_LD) $(LFLAGS) $(C_OBJS) -o $@ $(addprefix -l, $(LIBS))

$(CPP_TARGET): $(CPP_OBJS)
	@$(ECHO) "Link $(notdir $^)"
	@$(CXX_LD) $(LFLAGS) $(CPP_OBJS) -o $@ $(addprefix -l, $(LIBS))

$(C_OBJDIR) $(CPP_OBJDIR):
	@$(MKDIR) $@

vpath %.c $(CUR_DIR)
$(CPP_OBJDIR)/%.o: %.cpp
	@if [ ! -d $(dir $@) ];then $(MKDIR) $(dir $@);fi
	@$(ECHO) "Compile $(notdir $<)"
	@$(CXX) $(CXXFLAGS) $< -o $@

vpath %.c $(CUR_DIR)
$(C_OBJDIR)/%.o: %.c
	@if [ ! -d $(dir $@) ];then $(MKDIR) $(dir $@);fi
	@$(ECHO) "Compile $(notdir $<)"
	@$(CC) $(CFLAGS) $< -o $@

clean:
	-@$(RM) $(C_OBJDIR)
	-@$(RM) $(C_TARGET)
	-@$(RM) $(CPP_OBJDIR)
	-@$(RM) $(CPP_TARGET)

-include  $(C_OBJDIR)/*.d
-include  $(CPP_OBJDIR)/*.d


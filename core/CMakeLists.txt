cmake_minimum_required(VERSION 3.16)
project(tracker_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# Treat warnings as errors, so nothing sloppy gets in.
if(MSVC)
  add_compile_options(/W4 /WX)
else()
  add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# Turn this on (Linux and macOS) to catch memory errors while the tests run:
#   cmake -S core -B build -DTRACKER_SANITIZE=ON
option(TRACKER_SANITIZE "Build with address and undefined-behaviour sanitizers" OFF)
if(TRACKER_SANITIZE)
  add_compile_options(-fsanitize=address,undefined -fno-omit-frame-pointer)
  add_link_options(-fsanitize=address,undefined)
endif()

# The rules and calculations, with no input or output of their own.
file(GLOB TRACKER_LIB_SOURCES CONFIGURE_DEPENDS src/lib/*.cpp)
add_library(tracker_lib STATIC ${TRACKER_LIB_SOURCES})
target_include_directories(tracker_lib PUBLIC include)

# The program: a terminal menu, plus an "engine" mode the backend talks to.
add_executable(tracker src/main.cpp src/cli.cpp)
target_link_libraries(tracker PRIVATE tracker_lib)

# The tests.
file(GLOB TRACKER_TEST_SOURCES CONFIGURE_DEPENDS tests/*.cpp)
add_executable(tracker_tests ${TRACKER_TEST_SOURCES})
target_link_libraries(tracker_tests PRIVATE tracker_lib)

# On Windows with MinGW, build the programs with the C++ library inside them.
# - tracker.exe then runs anywhere, without needing extra DLL files next to it.
# - The leak check in the tests counts every allocation, and it can only do
#   that when the C++ library's own allocations go through the test program.
if(MINGW)
  target_link_options(tracker PRIVATE -static)
  target_link_options(tracker_tests PRIVATE -static)
endif()

enable_testing()
add_test(NAME unit_tests COMMAND tracker_tests)

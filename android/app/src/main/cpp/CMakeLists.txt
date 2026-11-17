# Builds the C++ grade engine for Android.
#
# It uses the very same source files as the laptop build in core/, so there is
# still only one copy of every grade rule. The only Android-only file is the
# bridge, tracker_jni.cpp, which lets Kotlin call the engine.
cmake_minimum_required(VERSION 3.22.1)
project(tracker_android LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# From android/app/src/main/cpp up to the repository root, then into core/.
set(CORE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../../../../core)

file(GLOB CORE_SOURCES CONFIGURE_DEPENDS ${CORE_DIR}/src/lib/*.cpp)

add_library(tracker SHARED tracker_jni.cpp ${CORE_SOURCES})
target_include_directories(tracker PRIVATE ${CORE_DIR}/include)

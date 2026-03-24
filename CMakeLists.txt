cmake_minimum_required(VERSION 3.20)

if(POLICY CMP0167)
    cmake_policy(SET CMP0167 NEW)
endif()

project(FrowCRRd VERSION 1.0.0 LANGUAGES CXX)

include(CTest)

if(PROJECT_IS_TOP_LEVEL)
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
endif()

if(NOT CMAKE_CONFIGURATION_TYPES AND NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type (default: Release)" FORCE)
    set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS Debug Release RelWithDebInfo MinSizeRel)
endif()

option(FROWCRRD_ENABLE_IPO "Enable interprocedural optimization for Release-like builds." ON)
option(FROWCRRD_WARNINGS_AS_ERRORS "Treat compiler warnings as errors." OFF)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(Eigen3 REQUIRED)
find_package(Boost REQUIRED COMPONENTS numeric_odeint)

add_library(frowcrrd_project_options INTERFACE)
add_library(frowcrrd::project_options ALIAS frowcrrd_project_options)
target_compile_features(frowcrrd_project_options INTERFACE cxx_std_20)

if(WIN32)
    target_compile_definitions(frowcrrd_project_options INTERFACE NOMINMAX)
endif()

if(MSVC)
    target_compile_options(frowcrrd_project_options INTERFACE /permissive- /Zc:__cplusplus /utf-8)
endif()

if(FROWCRRD_ENABLE_IPO)
    include(CheckIPOSupported)
    check_ipo_supported(RESULT frowcrrd_ipo_supported OUTPUT frowcrrd_ipo_error)
    if(frowcrrd_ipo_supported)
        set(CMAKE_INTERPROCEDURAL_OPTIMIZATION_RELEASE ON)
        set(CMAKE_INTERPROCEDURAL_OPTIMIZATION_RELWITHDEBINFO ON)
    else()
        message(STATUS "IPO/LTO is disabled: ${frowcrrd_ipo_error}")
    endif()
endif()

add_library(frowcrrd_project_warnings INTERFACE)
add_library(frowcrrd::project_warnings ALIAS frowcrrd_project_warnings)

if(MSVC)
    target_compile_options(frowcrrd_project_warnings INTERFACE /W4)
    if(FROWCRRD_WARNINGS_AS_ERRORS)
        target_compile_options(frowcrrd_project_warnings INTERFACE /WX)
    endif()
else()
    target_compile_options(frowcrrd_project_warnings INTERFACE -Wall -Wextra -Wpedantic)
    if(FROWCRRD_WARNINGS_AS_ERRORS)
        target_compile_options(frowcrrd_project_warnings INTERFACE -Werror)
    endif()
endif()

add_subdirectory(Configs)
add_subdirectory(Models)
add_subdirectory(Core)
add_subdirectory(Bridge)

if(BUILD_TESTING)
    add_subdirectory(Tests)
endif()

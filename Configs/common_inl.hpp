#pragma once
#ifndef COMMON_INL_HPP
#define COMMON_INL_HPP

#ifdef _MSC_VER
    #define ALWAYS_INLINE __forceinline
#else
    #define ALWAYS_INLINE __attribute__((always_inline))
#endif

#endif // COMMON_INL_HPP
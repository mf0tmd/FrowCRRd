#pragma once
#ifndef CONSTS_IND_HPP
#define CONSTS_IND_HPP

namespace StateIndex
{
    constexpr int ALTITUDE = 0; //              высота
    constexpr int VERTICAL_VEL = 1; //          вертикальная скорость
    constexpr int HORIZONTAL_VEL = 2; //        горизонтальная скорость
    constexpr int DOWNRANGE_DIST = 3; //        расстояние по горизонтали
    constexpr int MASS = 4; //                  масса
}

namespace DerivIndex
{
    constexpr int DH_DT = 0;    // dh/dt        вертикальная скорость
    constexpr int DVVERT_DT = 1;    // dv/dt    вертикальное ускорение
    constexpr int DVHOR_DT = 2; //              горизонтальное ускорение
    constexpr int DDN_DT = 3; //                горизонтальная скорость
    constexpr int DM_DT = 4;    // dm/dt        расход массы
}

#endif // CONSTS_IND_HPP
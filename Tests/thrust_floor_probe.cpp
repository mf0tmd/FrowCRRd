#include "Models/Rocket/Stage/Engine/engine.hpp"
#include <iostream>
#include <vector>
#include <cmath>
int main(){
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 0.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 1.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 0.0, 3.0}
    };
    Engine e("osc", 1000.0, 10.0, 50.0, std::move(throttle));
    double min_t = 1e18;
    for(double t=0.0; t<=3.0; t+=0.001){
        double th = e.get_current_thrust(t);
        if(th < min_t) min_t = th;
    }
    std::cout << "min_thrust=" << min_t << "\n";
    return (std::isfinite(min_t) && min_t >= -1e-12) ? 0 : 1;
}

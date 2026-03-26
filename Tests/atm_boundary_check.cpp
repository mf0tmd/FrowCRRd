#include "Models/Atmosphere/atmosphere.hpp"
#include "Configs/config.hpp"
#include <iostream>
#include <cmath>
int main(){
  AtmosphereModel a(Config::get().get_active_atmosphere_path());
  auto p0 = a.get_atmosphere(80000.0);
  auto p1 = a.get_atmosphere(80100.0);
  const double ratio = p1.density / p0.density;
  std::cout << "rho_80000=" << p0.density << " rho_80100=" << p1.density << " ratio=" << ratio << "\n";
  std::cout << "p_80000=" << p0.pressure << " p_80100=" << p1.pressure << "\n";
  const bool finite_all = std::isfinite(p0.density) && std::isfinite(p1.density) && std::isfinite(ratio) &&
      std::isfinite(p0.pressure) && std::isfinite(p1.pressure);
  const bool monotonic = ratio > 0.0 && ratio < 1.0 && p1.pressure < p0.pressure;
  return (finite_all && monotonic) ? 0 : 1;
}

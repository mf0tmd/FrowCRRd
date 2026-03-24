#include "Models/Atmosphere/atmosphere.hpp"
#include "Configs/config.hpp"
#include <iostream>
#include <cmath>

int main() {
    AtmosphereModel atm(Config::get().get_active_atmosphere_path());
    const auto in = atm.get_atmosphere(79999.0);
    const auto edge = atm.get_atmosphere(80000.0);
    const auto out = atm.get_atmosphere(80001.0);
    std::cout << "in_p=" << in.pressure << " out_p=" << out.pressure << " edge_p=" << edge.pressure << "\n";
    std::cout << "in_mu=" << in.viscosity << " out_mu=" << out.viscosity << "\n";
    std::cout << "in_rho=" << in.density << " out_rho=" << out.density << "\n";

    const bool finite_all =
        std::isfinite(in.pressure) && std::isfinite(edge.pressure) && std::isfinite(out.pressure) &&
        std::isfinite(in.viscosity) && std::isfinite(out.viscosity) &&
        std::isfinite(in.density) && std::isfinite(out.density);
    const bool positive_all =
        in.pressure > 0.0 && edge.pressure > 0.0 && out.pressure > 0.0 &&
        in.viscosity > 0.0 && out.viscosity > 0.0 &&
        in.density >= 0.0 && out.density >= 0.0;
    return (finite_all && positive_all) ? 0 : 1;
}

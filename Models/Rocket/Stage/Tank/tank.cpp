#include "tank.hpp"

Tank::Tank(std::string name, double dry_mass, double fuel_mass) noexcept :
    name_(std::move(name)),
    dry_mass_(dry_mass),
    fuel_mass_(fuel_mass) {}
    
#include "parachute_sys.hpp"

Parachute::Parachute(DataTypePar value_type, bool isDrogue, double area, std::pair<double, double> deploy_range) :
value_type_(value_type),
isDrogue_(isDrogue),
deploy_range_(deploy_range),
area_(area) {}

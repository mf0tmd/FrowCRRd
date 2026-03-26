#include "Core/Physics/physics.hpp"
#include "Core/Physics/consts_ind.hpp"
#include <iostream>
#include <vector>
#include <list>
#include <cmath>

static Rocket make_rocket(bool with_parachute) {
    std::vector<Engine::ThrottlePoint> throttle = {
        {Engine::ThrottlePoint::DataTypeEng::TIME, 0.0, 0.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 0.0, 1.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 0.0, 2.0},
        {Engine::ThrottlePoint::DataTypeEng::TIME, 0.0, 3.0}
    };

    Engine engine("e", 0.0, 0.0, 10.0, std::move(throttle));
    Tank tank("t", 100.0, 0.0);
    std::vector<Engine> engines;
    engines.push_back(std::move(engine));

    Stage stage(std::move(engines), std::move(tank), SeparationMode::ByTime, 100.0, 0.0, 1.0, 1e9);
    std::list<Stage> stages;
    stages.push_back(std::move(stage));

    std::vector<Rocket::PitchAnglePoint> pitch = {
        {Rocket::PitchAnglePoint::DataTypePitch::TIME, 90.0, 0.0}
    };

    Rocket rocket(std::move(stages), fSeparationMode::ByTime, 0.0, 1e9, std::move(pitch));
    if (with_parachute) {
        rocket.add_parachute(Parachute(Parachute::DataTypePar::ALTITUDE, false, 20.0, {3000.0, 0.0}));
    }
    return rocket;
}

int main() {
    Rocket r_no = make_rocket(false);
    Rocket r_yes = make_rocket(true);

    Physics p_no(r_no);
    Physics p_yes(r_yes);

    Eigen::VectorXd state(5);
    state << 1000.0, 50.0, 0.0, 0.0, 500.0; // ascending

    auto d_no_up = p_no.calculate_derivatives(state, 0.0, 0.0);
    auto d_yes_up = p_yes.calculate_derivatives(state, 0.0, 0.0);

    state[StateIndex::VERTICAL_VEL] = -50.0; // descending
    auto d_no_down = p_no.calculate_derivatives(state, 0.0, 0.0);
    auto d_yes_down = p_yes.calculate_derivatives(state, 0.0, 0.0);

    std::cout << "up_no=" << d_no_up[DerivIndex::DVVERT_DT] << " up_yes=" << d_yes_up[DerivIndex::DVVERT_DT]
              << " diff_up=" << (d_yes_up[DerivIndex::DVVERT_DT] - d_no_up[DerivIndex::DVVERT_DT]) << "\n";

    std::cout << "down_no=" << d_no_down[DerivIndex::DVVERT_DT] << " down_yes=" << d_yes_down[DerivIndex::DVVERT_DT]
              << " diff_down=" << (d_yes_down[DerivIndex::DVVERT_DT] - d_no_down[DerivIndex::DVVERT_DT]) << "\n";

    const double diff_up = d_yes_up[DerivIndex::DVVERT_DT] - d_no_up[DerivIndex::DVVERT_DT];
    const double diff_down = d_yes_down[DerivIndex::DVVERT_DT] - d_no_down[DerivIndex::DVVERT_DT];
    const bool ascent_unchanged = std::abs(diff_up) <= 1e-10;
    const bool descent_improved = diff_down > 0.0;
    return (ascent_unchanged && descent_improved) ? 0 : 1;
}

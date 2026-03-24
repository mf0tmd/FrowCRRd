#pragma once
#ifndef DRAG_MODEL_HPP
#define DRAG_MODEL_HPP

#include "Configs/config.hpp"

#include <vector>
#include <string>
#include <boost/math/interpolators/makima.hpp>
#include <optional>
#include <unordered_map>

using makima_inter = boost::math::interpolators::makima<std::vector<double>>;

struct DragPoint
{
    double mach;
    double cd;

    bool operator<(const DragPoint& other) const {
        return mach < other.mach;
    }
};

class DragModel final
{
public:
    DragModel() noexcept {}
    DragModel(const std::string& filename); // download CSV
    double get_drag_coefficient(double mach) const;

private:
    std::vector<DragPoint> data_drag_table_;
    std::optional<makima_inter> interpolator_;

    mutable std::unordered_map<double, DragPoint> cache_;
    std::string filename_;
    double min_mach_ = 0.0;
    double max_mach_ = 0.0;

    void load_and_prepare_data();
};

#endif // DRAG_MODEL_HPP

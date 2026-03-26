#include "drag_table.hpp"
#include <fstream>
#include <algorithm>
#include <cmath>
#include <stdexcept>


DragModel::DragModel(const std::string& filename) : filename_(filename) {
    std::ifstream file(filename);
    if (!file) { throw std::runtime_error("Cannot open drag model file"); }

    DragPoint point;
    while (file >> point.mach >> point.cd) {
        data_drag_table_.push_back(point);
    }

    if (file.bad() || (!file.eof() && file.fail())) {
        throw std::runtime_error("Failed while reading drag model file: " + filename);
    }

    if (data_drag_table_.size() < 4) {
        throw std::runtime_error("Drag model file must contain at least 4 points.");
    }

    std::sort(data_drag_table_.begin(), data_drag_table_.end());
    for (std::size_t i = 1; i < data_drag_table_.size(); ++i) {
        if (data_drag_table_[i].mach <= data_drag_table_[i - 1].mach) {
            throw std::runtime_error("Drag model Mach values must be strictly increasing.");
        }
    }

    min_mach_ = data_drag_table_.front().mach;
    max_mach_ = data_drag_table_.back().mach;

    load_and_prepare_data();
}

double DragModel::get_drag_coefficient(double mach) const {
    const double safe_mach = std::isfinite(mach) ? mach : 0.0;
    const double rounded_mach = std::round(safe_mach * 1000.0) / 1000.0;
    const double clamped_mach = std::clamp(rounded_mach, min_mach_, max_mach_);

    auto it = cache_.find(clamped_mach);
    if (it != cache_.end()) {
        return it->second.cd;
    }

    if (!interpolator_) {
        throw std::runtime_error("Drag model interpolator is not initialized: " + filename_);
    }

    double cd = interpolator_.value()(clamped_mach);
    DragPoint point = DragPoint(clamped_mach, cd);

    cache_[clamped_mach] = point;

    return cd;
}

void DragModel::load_and_prepare_data() {
     std::vector<double> mach_vec, cd_vec;
     const size_t size_vects = data_drag_table_.size();

     mach_vec.reserve(size_vects);
     cd_vec.reserve(size_vects);

    for (const auto& poi : data_drag_table_) {
        mach_vec.push_back(poi.mach);
        cd_vec.push_back(poi.cd);
    }

    interpolator_ = makima_inter(std::move(mach_vec), std::move(cd_vec));
}

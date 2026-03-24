add_library(core STATIC
    Physics/physics.cpp
    Simulation/simulation.cpp
)

target_include_directories(core
    PUBLIC
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}>
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/Core>
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/Models>
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/Configs>
)

target_link_libraries(core
    PUBLIC
        configs
        models
        Eigen3::Eigen
        Boost::numeric_odeint
        Boost::boost
        frowcrrd::project_options
        frowcrrd::project_warnings
)

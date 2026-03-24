add_library(models STATIC
    Aerodynamics/drag_table.cpp
    Atmosphere/atmosphere.cpp
    Rocket/rocket.cpp
    Rocket/Stage/stage.cpp
    Rocket/Stage/Engine/engine.cpp
    Rocket/Stage/Tank/tank.cpp
    Rocket/parachute_sys.cpp
)

target_include_directories(models
    PUBLIC
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}>
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/Models>
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/Configs>
)

target_link_libraries(models
    PUBLIC
        configs
        Eigen3::Eigen
        Boost::boost
        frowcrrd::project_options
        frowcrrd::project_warnings
)

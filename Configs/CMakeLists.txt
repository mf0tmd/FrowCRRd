add_library(configs STATIC
    config.cpp
)

target_include_directories(configs
    PUBLIC
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}>
        $<BUILD_INTERFACE:${PROJECT_SOURCE_DIR}/Configs>
)

target_link_libraries(configs
    PUBLIC
        Boost::boost
        frowcrrd::project_options
        frowcrrd::project_warnings
)

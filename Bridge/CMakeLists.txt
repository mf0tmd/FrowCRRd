add_executable(frowcrrd_runner
    runner.cpp
)

target_link_libraries(frowcrrd_runner
    PRIVATE
        core
        models
        configs
        Boost::boost
        frowcrrd::project_options
        frowcrrd::project_warnings
)

set_target_properties(frowcrrd_runner PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin"
)

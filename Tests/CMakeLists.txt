set(FROWCRRD_TEST_SOURCES
    atm_boundary_check.cpp
    atm_probe.cpp
    burn_sync_check.cpp
    cross_section_after_pop.cpp
    deep_core_audit.cpp
    final_stage_behavior.cpp
    parachute_active_check.cpp
    parachute_ascent_probe.cpp
    parachute_check.cpp
    parachute_order_probe.cpp
    parachute_physics_probe.cpp
    run_twice_check.cpp
    smoke_core.cpp
    stage_sep_check.cpp
    thrust_floor_probe.cpp
    time_grid_probe.cpp
    validation_checks.cpp
)

set(FROWCRRD_TEST_TARGETS)
foreach(test_src IN LISTS FROWCRRD_TEST_SOURCES)
    get_filename_component(test_name "${test_src}" NAME_WE)
    add_executable("${test_name}" "${test_src}")
    target_link_libraries("${test_name}"
        PRIVATE
            core
            models
            configs
            frowcrrd::project_options
            frowcrrd::project_warnings
    )

    add_test(NAME "${test_name}" COMMAND "${test_name}")
    set_tests_properties("${test_name}" PROPERTIES
        WORKING_DIRECTORY "${PROJECT_SOURCE_DIR}"
        TIMEOUT 120
        LABELS "core;audit"
    )
    list(APPEND FROWCRRD_TEST_TARGETS "${test_name}")
endforeach()

set_tests_properties(deep_core_audit PROPERTIES
    TIMEOUT 900
    LABELS "core;audit;deep"
)

set_tests_properties(
    parachute_ascent_probe
    parachute_order_probe
    parachute_physics_probe
    thrust_floor_probe
    time_grid_probe
    PROPERTIES LABELS "core;audit;probe"
)

add_custom_target(massive_audit
    COMMAND "${CMAKE_CTEST_COMMAND}" --output-on-failure --timeout 900
    DEPENDS ${FROWCRRD_TEST_TARGETS}
    WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
    USES_TERMINAL
)

add_custom_target(massive_audit_quick
    COMMAND "${CMAKE_CTEST_COMMAND}" --output-on-failure --timeout 240 -LE deep
    DEPENDS ${FROWCRRD_TEST_TARGETS}
    WORKING_DIRECTORY "${CMAKE_BINARY_DIR}"
    USES_TERMINAL
)

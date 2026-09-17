package com.enesucar.inventory.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * Architecture fitness functions using ArchUnit.
 *
 * These rules are enforced at build time — a pull request that breaks a
 * layer boundary, introduces a cyclic dependency, or adds a Spring annotation
 * to the wrong package fails CI before human review.
 *
 * Why bother? Because architecture diagrams rot, but tests don't.
 */
@DisplayName("Architecture constraints")
class ArchitectureTest {

    private static final String ROOT = "com.enesucar.inventory";

    private static JavaClasses classes;

    @BeforeAll
    static void importClasses() {
        classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(ROOT);
    }

    // ── Layer isolation ──────────────────────────────────────────────────────

    @Test
    @DisplayName("Controllers must not access repositories directly")
    void controllers_must_not_access_repositories() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(ROOT + ".controller..")
                .should().accessClassesThat()
                .resideInAPackage(ROOT + ".repository..");
        rule.check(classes);
    }

    @Test
    @DisplayName("Repositories must not access services")
    void repositories_must_not_depend_on_services() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(ROOT + ".repository..")
                .should().dependOnClassesThat()
                .resideInAPackage(ROOT + ".service..");
        rule.check(classes);
    }

    @Test
    @DisplayName("Entities must not depend on services or controllers")
    void entities_must_be_pure() {
        ArchRule rule = noClasses()
                .that().resideInAPackage(ROOT + ".entity..")
                .should().dependOnClassesThat()
                .resideInAnyPackage(ROOT + ".service..", ROOT + ".controller..");
        rule.check(classes);
    }

    // ── Naming conventions ───────────────────────────────────────────────────

    @Test
    @DisplayName("Classes in controller package must be annotated @RestController")
    void controller_classes_must_be_annotated() {
        ArchRule rule = classes()
                .that().resideInAPackage(ROOT + ".controller..")
                .and().areNotInterfaces()
                .should().beAnnotatedWith(
                        org.springframework.web.bind.annotation.RestController.class);
        rule.check(classes);
    }

    @Test
    @DisplayName("Classes in service package must be annotated @Service")
    void service_classes_must_be_annotated() {
        ArchRule rule = classes()
                .that().resideInAPackage(ROOT + ".service..")
                .and().areNotInterfaces()
                .should().beAnnotatedWith(
                        org.springframework.stereotype.Service.class);
        rule.check(classes);
    }

    @Test
    @DisplayName("Classes in repository package must be interfaces")
    void repository_classes_must_be_interfaces() {
        ArchRule rule = classes()
                .that().resideInAPackage(ROOT + ".repository..")
                .should().beInterfaces();
        rule.check(classes);
    }

    // ── Layered architecture ─────────────────────────────────────────────────

    @Test
    @DisplayName("Layered architecture must be respected")
    void layered_architecture_is_respected() {
        layeredArchitecture()
                .consideringOnlyDependenciesInLayers()
                .layer("Controller").definedBy(ROOT + ".controller..")
                .layer("Service")   .definedBy(ROOT + ".service..")
                .layer("Repository").definedBy(ROOT + ".repository..")
                .layer("Entity")    .definedBy(ROOT + ".entity..")
                .layer("DTO")       .definedBy(ROOT + ".dto..")
                .layer("Security")  .definedBy(ROOT + ".security..")
                .layer("Filter")    .definedBy(ROOT + ".filter..")
                .layer("Aspect")    .definedBy(ROOT + ".aspect..")
                .layer("Event")     .definedBy(ROOT + ".event..")
                .whereLayer("Controller").mayNotBeAccessedByAnyLayer()
                .whereLayer("Service")  .mayOnlyBeAccessedByLayers("Controller", "Security", "Filter", "Aspect")
                .whereLayer("Repository").mayOnlyBeAccessedByLayers("Service")
                .whereLayer("Event").mayOnlyBeAccessedByLayers("Service")
                .check(classes);
    }
}

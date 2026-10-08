package com.enesucar.inventory.repository;

import com.enesucar.inventory.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    /**
     * All users with the given role, row-locked until the transaction ends. Used by the
     * last-admin guard: two admins demoting or deleting each other at the same moment must not
     * both pass the "is there another admin?" check.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.role = :role")
    List<User> findAllByRoleForUpdate(@Param("role") User.Role role);
}

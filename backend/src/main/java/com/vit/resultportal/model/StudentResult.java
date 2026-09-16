package com.vit.resultportal.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_results", uniqueConstraints = @UniqueConstraint(columnNames = "prn"))
public class StudentResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "PRN is required")
    @Size(max = 30)
    @Column(nullable = false, length = 30)
    private String prn;

    @NotBlank(message = "Student name is required")
    @Size(max = 100)
    @Column(nullable = false, length = 100)
    private String studentName;

    @NotBlank(message = "Division is required")
    @Size(max = 20)
    @Column(nullable = false, length = 20)
    private String division = "TY CS A";

    @Min(1)
    @Max(8)
    @Column(nullable = false)
    private int semester = 5;

    @NotBlank(message = "Academic year is required")
    @Size(max = 20)
    @Column(nullable = false, length = 20)
    private String academicYear = "2026-27";

    @Min(value = 0, message = "MSE must be at least 0")
    @Max(value = 30, message = "MSE is out of 30")
    private int daaMse;
    @Min(0) @Max(value = 70, message = "ESE is out of 70")
    private int daaEse;

    @Min(0) @Max(value = 30, message = "MSE is out of 30")
    private int dbmsMse;
    @Min(0) @Max(value = 70, message = "ESE is out of 70")
    private int dbmsEse;

    @Min(0) @Max(value = 30, message = "MSE is out of 30")
    private int blockchainMse;
    @Min(0) @Max(value = 70, message = "ESE is out of 70")
    private int blockchainEse;

    @Min(0) @Max(value = 30, message = "MSE is out of 30")
    private int webMse;
    @Min(0) @Max(value = 70, message = "ESE is out of 70")
    private int webEse;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        normalize();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
        normalize();
    }

    private void normalize() {
        if (prn != null) prn = prn.trim().toUpperCase();
        if (studentName != null) studentName = studentName.trim();
        if (division != null) division = division.trim().toUpperCase();
        if (academicYear != null) academicYear = academicYear.trim();
    }

    public int getDaaTotal() { return daaMse + daaEse; }
    public int getDbmsTotal() { return dbmsMse + dbmsEse; }
    public int getBlockchainTotal() { return blockchainMse + blockchainEse; }
    public int getWebTotal() { return webMse + webEse; }

    public String getDaaGrade() { return gradeFor(getDaaTotal()); }
    public String getDbmsGrade() { return gradeFor(getDbmsTotal()); }
    public String getBlockchainGrade() { return gradeFor(getBlockchainTotal()); }
    public String getWebGrade() { return gradeFor(getWebTotal()); }

    public int getGrandTotal() {
        return getDaaTotal() + getDbmsTotal() + getBlockchainTotal() + getWebTotal();
    }

    public double getPercentage() {
        return getGrandTotal() / 4.0;
    }

    public boolean isPassed() {
        return getDaaTotal() >= 40 && getDbmsTotal() >= 40 && getBlockchainTotal() >= 40 && getWebTotal() >= 40;
    }

    public String getStatus() { return isPassed() ? "PASS" : "FAIL"; }

    public String getOverallGrade() {
        if (!isPassed()) return "F";
        return gradeFor(getPercentage());
    }

    public double getSgpa() {
        double totalPoints = gradePointFor(getDaaTotal()) + gradePointFor(getDbmsTotal())
                + gradePointFor(getBlockchainTotal()) + gradePointFor(getWebTotal());
        return Math.round((totalPoints / 4.0) * 100.0) / 100.0;
    }

    public static String gradeFor(double mark) {
        if (mark >= 90) return "O";
        if (mark >= 80) return "A+";
        if (mark >= 70) return "A";
        if (mark >= 60) return "B+";
        if (mark >= 50) return "B";
        if (mark >= 40) return "C";
        return "F";
    }

    public static int gradePointFor(double mark) {
        if (mark >= 90) return 10;
        if (mark >= 80) return 9;
        if (mark >= 70) return 8;
        if (mark >= 60) return 7;
        if (mark >= 50) return 6;
        if (mark >= 40) return 5;
        return 0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPrn() { return prn; }
    public void setPrn(String prn) { this.prn = prn; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    public String getDivision() { return division; }
    public void setDivision(String division) { this.division = division; }
    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }
    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
    public int getDaaMse() { return daaMse; }
    public void setDaaMse(int daaMse) { this.daaMse = daaMse; }
    public int getDaaEse() { return daaEse; }
    public void setDaaEse(int daaEse) { this.daaEse = daaEse; }
    public int getDbmsMse() { return dbmsMse; }
    public void setDbmsMse(int dbmsMse) { this.dbmsMse = dbmsMse; }
    public int getDbmsEse() { return dbmsEse; }
    public void setDbmsEse(int dbmsEse) { this.dbmsEse = dbmsEse; }
    public int getBlockchainMse() { return blockchainMse; }
    public void setBlockchainMse(int blockchainMse) { this.blockchainMse = blockchainMse; }
    public int getBlockchainEse() { return blockchainEse; }
    public void setBlockchainEse(int blockchainEse) { this.blockchainEse = blockchainEse; }
    public int getWebMse() { return webMse; }
    public void setWebMse(int webMse) { this.webMse = webMse; }
    public int getWebEse() { return webEse; }
    public void setWebEse(int webEse) { this.webEse = webEse; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

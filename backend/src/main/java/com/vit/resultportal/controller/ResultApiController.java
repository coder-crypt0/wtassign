package com.vit.resultportal.controller;

import com.vit.resultportal.model.StudentResult;
import com.vit.resultportal.repository.StudentResultRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/results")
public class ResultApiController {
    private final StudentResultRepository repository;

    public ResultApiController(StudentResultRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Map<String, Object>> all() {
        return repository.findAllByOrderByStudentNameAsc().stream().map(this::dto).toList();
    }

    @GetMapping("/{id}")
    public Map<String, Object> one(@PathVariable Long id) {
        return dto(findResult(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@Valid @RequestBody StudentResult input) {
        if (repository.findByPrnIgnoreCase(input.getPrn()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A result with this PRN already exists.");
        }
        input.setId(null);
        return dto(repository.save(input));
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Long id, @Valid @RequestBody StudentResult input) {
        StudentResult existing = findResult(id);

        repository.findByPrnIgnoreCase(input.getPrn()).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "A result with this PRN already exists.");
            }
        });

        copyEditableFields(input, existing);
        return dto(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        StudentResult existing = findResult(id);
        repository.delete(existing);
    }

    private StudentResult findResult(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Result not found."));
    }

    private void copyEditableFields(StudentResult source, StudentResult target) {
        target.setPrn(source.getPrn());
        target.setStudentName(source.getStudentName());
        target.setDivision(source.getDivision());
        target.setSemester(source.getSemester());
        target.setAcademicYear(source.getAcademicYear());
        target.setDaaMse(source.getDaaMse());
        target.setDaaEse(source.getDaaEse());
        target.setDbmsMse(source.getDbmsMse());
        target.setDbmsEse(source.getDbmsEse());
        target.setBlockchainMse(source.getBlockchainMse());
        target.setBlockchainEse(source.getBlockchainEse());
        target.setWebMse(source.getWebMse());
        target.setWebEse(source.getWebEse());
    }

    private Map<String, Object> dto(StudentResult r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", r.getId());
        out.put("prn", r.getPrn());
        out.put("studentName", r.getStudentName());
        out.put("division", r.getDivision());
        out.put("semester", r.getSemester());
        out.put("academicYear", r.getAcademicYear());

        out.put("daaMse", r.getDaaMse());
        out.put("daaEse", r.getDaaEse());
        out.put("dbmsMse", r.getDbmsMse());
        out.put("dbmsEse", r.getDbmsEse());
        out.put("blockchainMse", r.getBlockchainMse());
        out.put("blockchainEse", r.getBlockchainEse());
        out.put("webMse", r.getWebMse());
        out.put("webEse", r.getWebEse());

        out.put("subjects", List.of(
                subject("Design and Analysis of Algorithms", "DAA", r.getDaaMse(), r.getDaaEse()),
                subject("Database Management Systems", "DBMS", r.getDbmsMse(), r.getDbmsEse()),
                subject("Blockchain Technology", "BCT", r.getBlockchainMse(), r.getBlockchainEse()),
                subject("Web Technology", "WT", r.getWebMse(), r.getWebEse())
        ));
        out.put("grandTotal", r.getGrandTotal());
        out.put("percentage", r.getPercentage());
        out.put("sgpa", r.getSgpa());
        out.put("grade", r.getOverallGrade());
        out.put("status", r.getStatus());
        out.put("createdAt", r.getCreatedAt());
        out.put("updatedAt", r.getUpdatedAt());
        return out;
    }

    private Map<String, Object> subject(String name, String code, int mse, int ese) {
        int total = mse + ese;
        return Map.of(
                "name", name,
                "code", code,
                "mse", mse,
                "ese", ese,
                "total", total,
                "grade", StudentResult.gradeFor(total),
                "status", total >= 40 ? "PASS" : "FAIL"
        );
    }
}

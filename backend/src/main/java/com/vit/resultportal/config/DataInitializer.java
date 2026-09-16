package com.vit.resultportal.config;

import com.vit.resultportal.model.StudentResult;
import com.vit.resultportal.repository.StudentResultRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
    private final StudentResultRepository repository;

    public DataInitializer(StudentResultRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (repository.count() > 0) return;

        repository.save(sample("112103001", "Aarav Kulkarni", 25, 61, 27, 58, 26, 63, 24, 60));
        repository.save(sample("112103002", "Ananya Deshmukh", 29, 66, 28, 64, 27, 65, 28, 67));
        repository.save(sample("112103003", "Kabir Shah", 18, 19, 23, 49, 22, 55, 24, 50));
        repository.save(sample("112103004", "Meera Patil", 26, 62, 25, 61, 28, 59, 27, 64));
    }

    private StudentResult sample(String prn, String name,
                                 int daaMse, int daaEse, int dbmsMse, int dbmsEse,
                                 int blockchainMse, int blockchainEse, int webMse, int webEse) {
        StudentResult r = new StudentResult();
        r.setPrn(prn);
        r.setStudentName(name);
        r.setDivision("TY CS A");
        r.setSemester(5);
        r.setAcademicYear("2026-27");
        r.setDaaMse(daaMse); r.setDaaEse(daaEse);
        r.setDbmsMse(dbmsMse); r.setDbmsEse(dbmsEse);
        r.setBlockchainMse(blockchainMse); r.setBlockchainEse(blockchainEse);
        r.setWebMse(webMse); r.setWebEse(webEse);
        return r;
    }
}

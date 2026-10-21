package com.crease.domain;

import java.util.List;

public record Team(String id, String name, String shortName, String color, List<Player> players) {
    public record Player(String id, String name, String role) {}

    public static Team of(String id) {
        return switch (id) {
            case "IND" -> make(id, "India", "#3788ff", "Rohit Sharma,Virat Kohli,Rishabh Pant,Suryakumar Yadav,Shivam Dube,Hardik Pandya,Ravindra Jadeja,Axar Patel,Kuldeep Yadav,Jasprit Bumrah,Arshdeep Singh");
            case "AUS" -> make(id, "Australia", "#e4b941", "Travis Head,David Warner,Mitchell Marsh,Glenn Maxwell,Marcus Stoinis,Tim David,Matthew Wade,Pat Cummins,Mitchell Starc,Adam Zampa,Josh Hazlewood");
            case "ENG" -> make(id, "England", "#ed5267", "Phil Salt,Jos Buttler,Will Jacks,Jonny Bairstow,Harry Brook,Moeen Ali,Liam Livingstone,Sam Curran,Jofra Archer,Adil Rashid,Mark Wood");
            case "SA" -> make(id, "South Africa", "#37b58c", "Quinton de Kock,Reeza Hendricks,Aiden Markram,Tristan Stubbs,Heinrich Klaasen,David Miller,Marco Jansen,Keshav Maharaj,Kagiso Rabada,Anrich Nortje,Tabraiz Shamsi");
            case "NZ" -> make(id, "New Zealand", "#8e9fae", "Finn Allen,Devon Conway,Kane Williamson,Rachin Ravindra,Daryl Mitchell,Glenn Phillips,Mitchell Santner,Michael Bracewell,Tim Southee,Trent Boult,Lockie Ferguson");
            case "PAK" -> make(id, "Pakistan", "#65bf7b", "Mohammad Rizwan,Babar Azam,Usman Khan,Fakhar Zaman,Iftikhar Ahmed,Shadab Khan,Imad Wasim,Shaheen Afridi,Naseem Shah,Haris Rauf,Mohammad Amir");
            case "WI" -> make(id, "West Indies", "#b17791", "Brandon King,Johnson Charles,Nicholas Pooran,Roston Chase,Rovman Powell,Sherfane Rutherford,Andre Russell,Romario Shepherd,Akeal Hosein,Alzarri Joseph,Gudakesh Motie");
            case "SL" -> make(id, "Sri Lanka", "#8a8fee", "Pathum Nissanka,Kusal Mendis,Kamindu Mendis,Sadeera Samarawickrama,Charith Asalanka,Angelo Mathews,Dasun Shanaka,Wanindu Hasaranga,Maheesh Theekshana,Matheesha Pathirana,Dushmantha Chameera");
            default -> throw new IllegalArgumentException("Unknown team: " + id);
        };
    }

    private static Team make(String id, String name, String color, String names) {
        var split = names.split(",");
        var players = java.util.stream.IntStream.range(0, split.length)
                .mapToObj(i -> new Player(id + "-" + i, split[i], i < 5 ? "Batter" : i < 7 ? "All-rounder" : "Bowler")).toList();
        return new Team(id, name, id, color, players);
    }
}

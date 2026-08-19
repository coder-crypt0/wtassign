<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ page import="java.sql.Connection,java.sql.DriverManager,java.sql.PreparedStatement,java.sql.ResultSet,java.security.MessageDigest,java.nio.charset.StandardCharsets,java.math.BigDecimal,java.math.RoundingMode,java.text.DecimalFormat,java.time.LocalDate,java.util.ArrayList,java.util.List" %>
<%!
    private static final String DB_URL = "jdbc:mysql://localhost:3307/wattwise?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD = "";

    private Connection connect() throws Exception {
        Class.forName("com.mysql.cj.jdbc.Driver");
        return DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
    }

    private String hashPassword(String password) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(password.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder();
        for (byte value : digest) hex.append(String.format("%02x", value));
        return hex.toString();
    }

    private String text(String value) { return value == null ? "" : value.trim(); }

    private String esc(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }

    private BigDecimal bill(BigDecimal units) {
        BigDecimal first = units.min(new BigDecimal("50")).multiply(new BigDecimal("3.50"));
        BigDecimal second = units.subtract(new BigDecimal("50")).max(BigDecimal.ZERO).min(new BigDecimal("100")).multiply(new BigDecimal("4.00"));
        BigDecimal third = units.subtract(new BigDecimal("150")).max(BigDecimal.ZERO).min(new BigDecimal("100")).multiply(new BigDecimal("5.20"));
        BigDecimal fourth = units.subtract(new BigDecimal("250")).max(BigDecimal.ZERO).multiply(new BigDecimal("6.50"));
        return first.add(second).add(third).add(fourth).setScale(2, RoundingMode.HALF_UP);
    }
%>
<%
    String action = text(request.getParameter("action"));
    String message = null;
    String error = null;
    Integer userId = (Integer) session.getAttribute("userId");

    if ("logout".equals(action)) {
        session.invalidate();
        response.sendRedirect("index.jsp");
        return;
    }

    if ("login".equals(action) || "register".equals(action)) {
        try (Connection db = connect()) {
            if ("login".equals(action)) {
                String email = text(request.getParameter("email")).toLowerCase();
                String password = request.getParameter("password");
                try (PreparedStatement statement = db.prepareStatement("SELECT id FROM users WHERE email = ? AND password_hash = ?")) {
                    statement.setString(1, email);
                    statement.setString(2, hashPassword(password == null ? "" : password));
                    try (ResultSet result = statement.executeQuery()) {
                        if (result.next()) {
                            session.setAttribute("userId", result.getInt("id"));
                            response.sendRedirect("index.jsp");
                            return;
                        }
                        error = "Email or password is incorrect.";
                    }
                }
            } else {
                String name = text(request.getParameter("fullName"));
                String email = text(request.getParameter("registerEmail")).toLowerCase();
                String password = request.getParameter("registerPassword");
                String meterNumber = text(request.getParameter("meterNumber"));
                String address = text(request.getParameter("address"));
                String city = text(request.getParameter("city"));
                String connectionType = text(request.getParameter("connectionType"));
                if (name.length() < 2 || email.length() < 5 || password == null || password.length() < 6 || meterNumber.isEmpty() || address.isEmpty() || city.isEmpty()) {
                    error = "Complete all fields. Password must contain at least 6 characters.";
                } else {
                    db.setAutoCommit(false);
                    try (PreparedStatement userStatement = db.prepareStatement("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)", PreparedStatement.RETURN_GENERATED_KEYS)) {
                        userStatement.setString(1, name);
                        userStatement.setString(2, email);
                        userStatement.setString(3, hashPassword(password));
                        userStatement.executeUpdate();
                        try (ResultSet keys = userStatement.getGeneratedKeys()) {
                            keys.next();
                            int newUserId = keys.getInt(1);
                            try (PreparedStatement meterStatement = db.prepareStatement("INSERT INTO meters (user_id, meter_number, address, city, connection_type) VALUES (?, ?, ?, ?, ?)")) {
                                meterStatement.setInt(1, newUserId);
                                meterStatement.setString(2, meterNumber);
                                meterStatement.setString(3, address);
                                meterStatement.setString(4, city);
                                meterStatement.setString(5, connectionType.isEmpty() ? "Domestic" : connectionType);
                                meterStatement.executeUpdate();
                            }
                            db.commit();
                            session.setAttribute("userId", newUserId);
                            response.sendRedirect("index.jsp");
                            return;
                        }
                    } catch (Exception registrationException) {
                        db.rollback();
                        throw registrationException;
                    }
                }
            }
        } catch (Exception databaseException) {
            error = "Database is not ready. Import wattwise.sql, start MySQL, and add MySQL Connector/J to Tomcat.";
        }
    }

    String fullName = "", email = "", meterNumber = "", address = "", city = "", connectionType = "Domestic";
    int meterId = 0;
    List<String[]> history = new ArrayList<String[]>();

    if (userId != null && "saveReading".equals(action)) {
        try (Connection db = connect(); PreparedStatement statement = db.prepareStatement("SELECT id FROM meters WHERE user_id = ?")) {
            statement.setInt(1, userId);
            try (ResultSet result = statement.executeQuery()) {
                if (result.next()) {
                    meterId = result.getInt(1);
                    BigDecimal units = new BigDecimal(text(request.getParameter("units")));
                    LocalDate readingDate = LocalDate.parse(text(request.getParameter("readingDate")));
                    if (units.compareTo(BigDecimal.ZERO) < 0) throw new IllegalArgumentException();
                    BigDecimal total = bill(units);
                    try (PreparedStatement insert = db.prepareStatement("INSERT INTO readings (meter_id, reading_date, units, bill_amount) VALUES (?, ?, ?, ?)")) {
                        insert.setInt(1, meterId);
                        insert.setObject(2, readingDate);
                        insert.setBigDecimal(3, units);
                        insert.setBigDecimal(4, total);
                        insert.executeUpdate();
                    }
                    message = "Reading saved and bill calculated: Rs. " + total.toPlainString();
                }
            }
        } catch (Exception saveException) {
            error = "Enter a valid date and non-negative unit reading.";
        }
    }

    if (userId != null) {
        try (Connection db = connect(); PreparedStatement profile = db.prepareStatement("SELECT u.full_name, u.email, m.id, m.meter_number, m.address, m.city, m.connection_type FROM users u JOIN meters m ON m.user_id = u.id WHERE u.id = ?")) {
            profile.setInt(1, userId);
            try (ResultSet result = profile.executeQuery()) {
                if (result.next()) {
                    fullName = result.getString("full_name"); email = result.getString("email"); meterId = result.getInt("id"); meterNumber = result.getString("meter_number"); address = result.getString("address"); city = result.getString("city"); connectionType = result.getString("connection_type");
                }
            }
            try (PreparedStatement readings = db.prepareStatement("SELECT reading_date, units, bill_amount FROM readings WHERE meter_id = ? ORDER BY reading_date DESC, id DESC LIMIT 12")) {
                readings.setInt(1, meterId);
                try (ResultSet result = readings.executeQuery()) {
                    while (result.next()) history.add(new String[]{result.getDate("reading_date").toString(), result.getBigDecimal("units").toPlainString(), result.getBigDecimal("bill_amount").toPlainString()});
                }
            }
        } catch (Exception databaseException) {
            error = "Could not load your account data. Check that MySQL and the schema are running.";
        }
    }
%>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wattwise | Meter Portal</title>
    <style>
        :root{--ink:#182b3a;--muted:#657888;--paper:#f4f7f3;--green:#0d493a;--green2:#176b52;--mint:#dcefe5;--yellow:#f6c94c;--line:#d7e3dc;--red:#a63d36;--white:#fff}
        *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Georgia,'Times New Roman',serif}.topbar{width:min(1180px,calc(100% - 48px));margin:auto;padding:25px 0;display:flex;justify-content:space-between;align-items:center}.brand{font-size:20px;font-weight:700;display:flex;gap:12px;align-items:center}.mark{display:grid;place-items:center;background:var(--yellow);color:var(--green);width:36px;height:36px;border-radius:50% 50% 50% 7px;font-family:Arial,sans-serif}.topbar a{font:700 13px Arial,sans-serif;color:var(--green2);text-decoration:none}.wrap{width:min(1180px,calc(100% - 48px));margin:35px auto 80px}.hero{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:35px}.eyebrow{font:700 12px Arial,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:var(--green2)}h1{font-size:clamp(40px,6vw,70px);line-height:.95;letter-spacing:-.04em;margin:14px 0 0;max-width:650px}.hello{font:14px Arial,sans-serif;color:var(--muted);text-align:right}.grid{display:grid;grid-template-columns:1fr 1.45fr;gap:24px}.panel{background:var(--white);padding:28px;border:1px solid var(--line);border-radius:4px}.dark{background:var(--green);color:var(--white);border:0;box-shadow:12px 12px 0 var(--mint)}h2{font-size:28px;font-weight:400;margin:0 0 8px}.sub{font:14px/1.5 Arial,sans-serif;color:var(--muted);margin:0 0 24px}.dark .sub{color:#b7d3c8}label{display:block;font:700 11px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;margin:17px 0 7px;color:var(--muted)}.dark label{color:#d4e5dd}input,select{width:100%;padding:13px 14px;border:1px solid var(--line);border-radius:3px;background:#fff;color:var(--ink);font:16px Georgia,serif;outline:0}input:focus,select:focus{border-color:var(--green2)}button{width:100%;border:0;border-radius:3px;padding:14px;margin-top:20px;background:var(--yellow);color:var(--green);font:700 13px Arial,sans-serif;cursor:pointer}button:hover{background:#ffda6d}.link-button{background:transparent;color:var(--green2);padding:0;margin:17px 0 0}.dark .link-button{color:var(--yellow)}.notice{padding:13px 16px;margin-bottom:22px;border-radius:3px;background:#e5f3e9;color:var(--green2);font:13px Arial,sans-serif}.alert{padding:13px 16px;margin-bottom:22px;border-radius:3px;background:#f9e5e1;color:var(--red);font:13px Arial,sans-serif}.profile{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}.profile-item{border-top:1px solid var(--line);padding-top:11px}.profile-item small{display:block;color:var(--muted);font:10px Arial,sans-serif;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px}.profile-item span{font:15px Arial,sans-serif}.table-wrap{overflow-x:auto}.history{width:100%;border-collapse:collapse;font:13px Arial,sans-serif}.history th{text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em;padding:12px 8px;border-bottom:2px solid var(--line)}.history td{padding:14px 8px;border-bottom:1px solid var(--line)}.empty{font:14px Arial,sans-serif;color:var(--muted);padding:20px 0}.rates{margin-top:24px;padding-top:20px;border-top:1px solid #477364;font:12px Arial,sans-serif;color:#b7d3c8;line-height:1.8}.auth{max-width:530px;margin:80px auto}.auth .split{display:grid;grid-template-columns:1fr 1fr;gap:16px}.auth h1{font-size:56px}.auth .panel{margin-top:30px}.footer-note{font:12px Arial,sans-serif;color:var(--muted);margin-top:20px}@media(max-width:850px){.topbar,.wrap{width:min(100% - 32px,600px)}.hero{display:block}.hello{text-align:left;margin-top:18px}.grid{display:block}.panel{margin-bottom:24px}.dark{box-shadow:8px 8px 0 var(--mint)}}@media(max-width:500px){.auth{margin:35px auto}.auth h1{font-size:48px}.auth .split,.profile{grid-template-columns:1fr}}
+    </style>
+</head>
+<body>
+<header class="topbar"><div class="brand"><span class="mark">W</span>wattwise</div><% if (userId != null) { %><a href="index.jsp?action=logout">Sign out</a><% } else { %><a href="#login">Member portal</a><% } %></header>
+<% if (userId == null) { %>
+<main class="wrap auth"><div class="eyebrow">Personal energy desk</div><h1>Your meter, in one place.</h1><p class="sub">Create an account to save readings, track your meter and estimate every monthly charge.</p>
+    <% if (error != null) { %><div class="alert"><%= esc(error) %></div><% } %>
+    <section class="panel" id="login"><h2>Welcome back</h2><p class="sub">Sign in to your meter account.</p><form method="post"><input type="hidden" name="action" value="login"><label>Email</label><input type="email" name="email" required><label>Password</label><input type="password" name="password" required><button type="submit">Sign in</button></form><button class="link-button" type="button" onclick="showRegister()">New here? Register your meter</button></section>
+    <section class="panel" id="register" style="display:none"><h2>Register your meter</h2><p class="sub">Your account and meter profile are saved in MySQL.</p><form method="post"><input type="hidden" name="action" value="register"><div class="auth split"><div><label>Full name</label><input name="fullName" required></div><div><label>Email</label><input type="email" name="registerEmail" required></div></div><div class="auth split"><div><label>Password</label><input type="password" name="registerPassword" minlength="6" required></div><div><label>Meter number</label><input name="meterNumber" required></div></div><label>Address</label><input name="address" required><div class="auth split"><div><label>City</label><input name="city" required></div><div><label>Connection</label><select name="connectionType"><option>Domestic</option><option>Commercial</option><option>Industrial</option></select></div></div><button type="submit">Create account</button></form><button class="link-button" type="button" onclick="showLogin()">Already registered? Sign in</button></section>
+    <p class="footer-note">Energy charges only. Fixed charges and taxes are not included.</p></main>
+<% } else { %>
+<main class="wrap"><div class="hero"><div><div class="eyebrow">Member dashboard</div><h1>Good to see you, <%= esc(fullName.split(" ")[0]) %>.</h1></div><div class="hello"><%= esc(meterNumber) %><br><%= esc(connectionType) %> connection</div></div><% if (message != null) { %><div class="notice"><%= esc(message) %></div><% } %><% if (error != null) { %><div class="alert"><%= esc(error) %></div><% } %>
+    <div class="grid"><section class="panel dark"><h2>Submit a reading</h2><p class="sub">Save your current meter reading and calculate the progressive energy charge.</p><form method="post"><input type="hidden" name="action" value="saveReading"><label>Reading date</label><input type="date" name="readingDate" value="<%= LocalDate.now() %>" required><label>Units consumed</label><input type="number" name="units" min="0" step="0.01" placeholder="e.g. 300" required><button type="submit">Save & calculate</button></form><div class="rates"><strong>Tariff slabs</strong><br>0–50: Rs. 3.50/unit · 51–150: Rs. 4.00/unit<br>151–250: Rs. 5.20/unit · Above 250: Rs. 6.50/unit</div></section><section class="panel"><h2>Meter profile</h2><p class="sub">Your registered connection details.</p><div class="profile"><div class="profile-item"><small>Account holder</small><span><%= esc(fullName) %></span></div><div class="profile-item"><small>Email</small><span><%= esc(email) %></span></div><div class="profile-item"><small>Meter number</small><span><%= esc(meterNumber) %></span></div><div class="profile-item"><small>Connection</small><span><%= esc(connectionType) %></span></div><div class="profile-item"><small>Address</small><span><%= esc(address) %></span></div><div class="profile-item"><small>City</small><span><%= esc(city) %></span></div></div></section></div>
+    <section class="panel" style="margin-top:24px"><h2>Previous readings</h2><p class="sub">Your latest saved meter submissions and calculated bills.</p><% if (history.isEmpty()) { %><div class="empty">No readings yet. Submit your first reading above.</div><% } else { %><div class="table-wrap"><table class="history"><thead><tr><th>Date</th><th>Units</th><th>Energy charge</th></tr></thead><tbody><% for (String[] reading : history) { %><tr><td><%= esc(reading[0]) %></td><td><%= esc(reading[1]) %> kWh</td><td><strong>Rs. <%= esc(reading[2]) %></strong></td></tr><% } %></tbody></table></div><% } %></section>
+</main><% } %>
+<script>function showRegister(){document.getElementById('login').style.display='none';document.getElementById('register').style.display='block'}function showLogin(){document.getElementById('register').style.display='none';document.getElementById('login').style.display='block'}</script>
+</body></html>

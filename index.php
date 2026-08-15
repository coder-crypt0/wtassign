<?php
require __DIR__ . '/includes/bill.php';

// No-JS fallback: plain form POST lands here and we render the result server-side.
$posted = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['units']) && is_numeric($_POST['units'])) {
    $posted = calculate_bill(min((float) $_POST['units'], 99999));
}

$initUnits  = $posted ? $posted['units'] : 0;
$initTotal  = $posted ? $posted['total'] : 0;
$initSlabs  = $posted ? $posted['slabs'] : calculate_bill(0)['slabs'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VOLTA — Electricity Bill Calculator</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="assets/css/style.css" rel="stylesheet">
</head>
<body>

<!-- ambient liquid background -->
<div class="scene" aria-hidden="true">
  <div class="blob blob-a"></div>
  <div class="blob blob-b"></div>
  <div class="blob blob-c"></div>
  <div class="ribbon"></div>
  <div class="grain"></div>
</div>

<!-- desktop floating pill nav -->
<nav class="pillnav glass d-none d-md-flex" id="pillnav">
  <a class="brand" href="#top">VOLTA<span>⌁</span></a>
  <a class="navlink is-active" href="#meter-section" data-nav>Meter</a>
  <a class="navlink" href="#tariff" data-nav>Tariff</a>
  <a class="navlink" href="#about" data-nav>About</a>
</nav>

<!-- mobile: liquid circle -> morphs into card -->
<div class="mobnav glass d-md-none" id="mobnav">
  <button class="mobnav-toggle" id="mobnavToggle" aria-label="Menu" aria-expanded="false">
    <span class="bar bar-1"></span>
    <span class="bar bar-2"></span>
    <span class="bar bar-3"></span>
  </button>
  <div class="mobnav-body">
    <div class="mobnav-brand">VOLTA<span>⌁</span></div>
    <a class="mobnav-link" href="#meter-section" data-nav>Meter</a>
    <a class="mobnav-link" href="#tariff" data-nav>Tariff</a>
    <a class="mobnav-link" href="#about" data-nav>About</a>
    <div class="mobnav-foot">slab billing · live meter</div>
  </div>
</div>

<main id="top">

  <!-- ============ HERO / METER ============ -->
  <section class="hero" id="meter-section">
    <div class="container-xl">
      <div class="row g-4 g-lg-5 align-items-center">

        <div class="col-lg-5 order-2 order-lg-1">
          <p class="kicker reveal">SLAB-WISE BILLING · PHP ENGINE</p>
          <h1 class="hero-title reveal">Watch your bill<br><em>spin up</em> live.</h1>
          <p class="hero-sub reveal">Type your consumed units and the meter's mechanical
          registers roll to your reading — the amount register settles on exactly what
          you owe, computed server-side in PHP.</p>

          <form class="unit-form glass reveal" id="billForm" method="post" action="index.php#meter-section" autocomplete="off">
            <label for="unitsInput">Units consumed <span>(kWh)</span></label>
            <div class="unit-row">
              <input type="number" min="0" max="99999" step="1" inputmode="numeric"
                     class="unit-input" id="unitsInput" name="units"
                     placeholder="0" value="<?php echo $posted ? (int) $initUnits : ''; ?>">
              <button type="submit" class="btn-liquid" id="calcBtn">Calculate</button>
            </div>
            <div class="form-hint" id="formHint">Registers react as you type — no need to press anything.</div>
          </form>

          <div class="chips reveal">
            <span class="chip glass-mini">₹3.50 <em>first 50</em></span>
            <span class="chip glass-mini">₹4.00 <em>next 100</em></span>
            <span class="chip glass-mini">₹5.20 <em>next 100</em></span>
            <span class="chip glass-mini">₹6.50 <em>above 250</em></span>
          </div>
        </div>

        <div class="col-lg-7 order-1 order-lg-2">
          <div class="meter-stage reveal">

            <!-- ================= THE METER ================= -->
            <div class="meter" id="meter">
              <div class="meter-screw s-tl"></div><div class="meter-screw s-tr"></div>
              <div class="meter-screw s-bl"></div><div class="meter-screw s-br"></div>

              <div class="meter-face">

                <div class="meter-plate">
                  <div class="plate-left">
                    <div class="plate-brand">VOLTA</div>
                    <div class="plate-model">V-220 · SINGLE PHASE ENERGY METER</div>
                  </div>
                  <div class="plate-right">
                    <div>240V ~ 50Hz</div>
                    <div>Cl 1.0 · 10–60A</div>
                  </div>
                </div>

                <!-- kWh register -->
                <div class="register">
                  <div class="register-label"><span>ENERGY REGISTER</span><b>kWh</b></div>
                  <div class="odometer" id="odoUnits" data-int="5" data-frac="1" data-value="<?php echo (int) $initUnits; ?>"></div>
                </div>

                <!-- rotor disc seen through slit -->
                <div class="disc-slit">
                  <div class="disc-track" id="discTrack"></div>
                  <div class="disc-glass"></div>
                </div>
                <div class="disc-caption"><span>1200 rev / kWh</span><span id="discState">IDLE</span></div>

                <!-- amount register -->
                <div class="register register-amt">
                  <div class="register-label"><span>AMOUNT PAYABLE</span><b>₹</b></div>
                  <div class="odometer odometer-amt" id="odoAmount" data-int="6" data-frac="2" data-value="<?php echo (float) $initTotal; ?>"></div>
                </div>

                <div class="meter-serial">
                  <span>SR. NO. 26-070-4415</span>
                  <span class="seal"></span>
                  <span>ISI · IS 13010</span>
                </div>
              </div>

              <div class="meter-terminals">
                <i></i><i></i><i></i><i></i>
              </div>
            </div>
            <!-- =============== /THE METER ================= -->

            <!-- breakdown ticket, fed by PHP -->
            <div class="ticket glass" id="ticket" data-live="<?php echo $posted ? '1' : '0'; ?>">
              <div class="ticket-head">
                <span>SLAB BREAKDOWN</span>
                <span class="ticket-units"><b id="ticketUnits"><?php echo (int) $initUnits; ?></b> kWh</span>
              </div>
              <table class="ticket-table" aria-live="polite">
                <thead>
                  <tr><th>Slab</th><th>Rate</th><th>Units</th><th class="t-r">Cost</th></tr>
                </thead>
                <tbody id="ticketBody">
                  <?php foreach ($initSlabs as $row): ?>
                  <tr class="<?php echo $row['units'] > 0 ? '' : 'is-dim'; ?>">
                    <td><?php echo htmlspecialchars($row['label']); ?></td>
                    <td>₹<?php echo number_format($row['rate'], 2); ?></td>
                    <td><?php echo (int) $row['units']; ?></td>
                    <td class="t-r">₹<?php echo number_format($row['cost'], 2); ?></td>
                  </tr>
                  <?php endforeach; ?>
                </tbody>
              </table>
              <div class="ticket-total">
                <span>TOTAL</span>
                <b id="ticketTotal">₹<?php echo number_format($initTotal, 2); ?></b>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  </section>

  <!-- ============ TARIFF ============ -->
  <section class="tariff" id="tariff">
    <div class="container-xl">
      <p class="kicker text-center reveal">TARIFF STRUCTURE</p>
      <h2 class="section-title text-center reveal">Four slabs. One rolling total.</h2>
      <div class="row g-4 mt-1">
        <?php
        $cards = [
            ['t' => '01', 'r' => '3.50', 'h' => 'First 50 units',  'd' => 'Your baseline consumption is billed at the lowest tariff of ₹3.50 per unit.'],
            ['t' => '02', 'r' => '4.00', 'h' => 'Next 100 units',  'd' => 'Units 51 through 150 step up to ₹4.00 per unit as usage grows.'],
            ['t' => '03', 'r' => '5.20', 'h' => 'Next 100 units',  'd' => 'Units 151 through 250 are metered at ₹5.20 per unit.'],
            ['t' => '04', 'r' => '6.50', 'h' => 'Above 250 units', 'd' => 'Every unit beyond 250 is billed at the peak tariff of ₹6.50 per unit.'],
        ];
        foreach ($cards as $c): ?>
        <div class="col-md-6 col-xl-3">
          <div class="slab-card glass reveal">
            <div class="slab-index"><?php echo $c['t']; ?></div>
            <div class="slab-rate">₹<?php echo $c['r']; ?><small>/unit</small></div>
            <h3><?php echo $c['h']; ?></h3>
            <p><?php echo $c['d']; ?></p>
          </div>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
  </section>

  <!-- ============ ABOUT / FOOTER ============ -->
  <footer class="about" id="about">
    <div class="container-xl">
      <div class="about-card glass reveal">
        <div class="row g-4 align-items-center">
          <div class="col-lg-7">
            <h2 class="section-title">How it works</h2>
            <p class="mb-0">Every keystroke is debounced and posted with jQuery to a PHP
            endpoint that applies the slab tariff server-side and returns JSON. The meter's
            registers are true mechanical odometers — each wheel carries into the next only
            as the lower wheel passes nine, exactly like the gear train in a real kWh meter.</p>
          </div>
          <div class="col-lg-5">
            <ul class="stack-list">
              <li><b>PHP 8</b><span>slab billing engine</span></li>
              <li><b>jQuery</b><span>AJAX + register tweening</span></li>
              <li><b>Bootstrap 5</b><span>responsive grid</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="foot-line">VOLTA · Web Technology Assignment 1 · <?php echo date('Y'); ?></div>
    </div>
  </footer>

</main>

<script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>

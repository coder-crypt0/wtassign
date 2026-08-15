/* ============================================================
   VOLTA — live meter frontend
   jQuery drives: mechanical odometers, AJAX to PHP, liquid nav.
   ============================================================ */

$(function () {

  "use strict";

  var DIGIT_EM = 1.5; // must match .odo-digit height in CSS

  /* ==========================================================
     MECHANICAL ODOMETER
     Each wheel is a drum with digits 0-9 (plus a wrap "0").
     Carry mechanics mirror a real gear train: a wheel only
     turns while the wheel below it sweeps from 9 to 0.
     ========================================================== */

  function buildOdometer($el) {
    var intDigits  = parseInt($el.data("int"), 10)  || 5;
    var fracDigits = parseInt($el.data("frac"), 10) || 0;
    var total      = intDigits + fracDigits;
    var wheels     = []; // rightmost-first

    $el.empty();

    for (var i = 0; i < total; i++) {
      var isFrac = i >= intDigits;
      var $wheel = $('<div class="odo-wheel"></div>').toggleClass("odo-frac", isFrac);
      var $strip = $('<div class="odo-strip"></div>');
      for (var d = 0; d <= 10; d++) { // 0..9 + wrap 0
        $strip.append($('<div class="odo-digit"></div>').text(d % 10));
      }
      $wheel.append($strip);

      // thousands separator (between int wheels), decimal point before frac
      if (isFrac && i === intDigits) {
        $el.append($('<div class="odo-point">.</div>'));
      } else if (!isFrac && i > 0 && (intDigits - i) % 3 === 0) {
        $el.append($('<div class="odo-comma">,</div>'));
      }

      $el.append($wheel);
      wheels.push($strip[0]); // DOM order = leftmost first for now
    }

    // reorder to rightmost-first for the carry math
    wheels.reverse();

    var scale = Math.pow(10, fracDigits);
    var max   = Math.pow(10, total) - 1;

    return {
      render: function (value) {
        var v = Math.min(Math.max(0, value * scale), max);
        for (var i = 0; i < wheels.length; i++) {
          var base = Math.pow(10, i);
          var digit = Math.floor(v / base) % 10;
          var pos;
          if (i === 0) {
            pos = (v / base) % 10; // driven wheel rolls continuously
          } else {
            // carry: this wheel moves only while the lower stack sweeps 9 -> 0
            var lower = (v % base) / (base / 10); // 0..10
            pos = digit + (lower > 9 ? lower - 9 : 0);
          }
          wheels[i].style.transform = "translateY(" + (-pos * DIGIT_EM) + "em)";
        }
      }
    };
  }

  var odoUnits  = buildOdometer($("#odoUnits"));
  var odoAmount = buildOdometer($("#odoAmount"));

  /* ==========================================================
     TWEEN ENGINE — jQuery animates a plain object; every frame
     re-renders both registers so the drums roll like gears.
     ========================================================== */

  var shown = { u: 0, a: 0 }; // what the meter currently displays

  function renderAll() {
    odoUnits.render(shown.u);
    odoAmount.render(shown.a);
  }

  function spinTo(units, amount) {
    var delta = Math.abs(units - shown.u) + Math.abs(amount - shown.a) / 10;
    var dur   = Math.min(2600, Math.max(650, 350 + delta * 6));

    $("#meter").addClass("is-working");
    $("#discState").text("RUNNING");
    setDiscSpeed(units);

    $(shown).stop(true).animate(
      { u: units, a: amount },
      {
        duration: dur,
        easing: "swing",
        step: renderAll,
        complete: function () {
          shown.u = units;
          shown.a = amount;
          renderAll();
          $("#meter").removeClass("is-working");
          $("#discState").text(units > 0 ? "LOAD" : "IDLE");
          if (units <= 0) { setDiscSpeed(0); }
        }
      }
    );
  }

  /* rotor disc: spins faster with heavier load */
  function setDiscSpeed(units) {
    var track = document.getElementById("discTrack");
    if (units <= 0) {
      track.style.setProperty("--disc-play", "paused");
      return;
    }
    // 6s crawl at 1 unit down to 0.35s blur at 5000+
    var dur = Math.max(0.35, 6 / Math.pow(units, 0.45));
    track.style.setProperty("--disc-dur", dur.toFixed(2) + "s");
    track.style.setProperty("--disc-play", "running");
  }

  /* ==========================================================
     PHP BILLING — debounce keystrokes, POST to calculate.php,
     feed the JSON back into the registers + ticket.
     ========================================================== */

  var debounceTimer = null;
  var activeRequest = null;

  function requestBill(units) {
    if (activeRequest) { activeRequest.abort(); }

    activeRequest = $.post("calculate.php", { units: units })
      .done(function (data) {
        if (!data || !data.ok) { return; }
        $("#formHint").removeClass("is-error")
          .text("Computed by PHP · " + data.units + " kWh across " + countSlabs(data.slabs) + " slab(s).");
        spinTo(data.units, data.total);
        updateTicket(data);
      })
      .fail(function (xhr, status) {
        if (status === "abort") { return; }
        var msg = (xhr.responseJSON && xhr.responseJSON.error) ||
                  "Could not reach the PHP engine — is the server running?";
        $("#formHint").addClass("is-error").text(msg);
      })
      .always(function () { activeRequest = null; });
  }

  function countSlabs(slabs) {
    var n = 0;
    for (var i = 0; i < slabs.length; i++) { if (slabs[i].units > 0) { n++; } }
    return n;
  }

  function money(n) {
    return "₹" + Number(n).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function updateTicket(data) {
    var $body = $("#ticketBody").empty();
    $.each(data.slabs, function (_, row) {
      $("<tr>")
        .toggleClass("is-dim", row.units <= 0)
        .append($("<td>").text(row.label))
        .append($("<td>").text(money(row.rate)))
        .append($("<td>").text(row.units))
        .append($('<td class="t-r">').text(money(row.cost)))
        .appendTo($body);
    });
    $("#ticketUnits").text(data.units);
    $("#ticketTotal").text(money(data.total));

    var $ticket = $("#ticket").removeClass("is-bump");
    void $ticket[0].offsetWidth; // restart the bump animation
    $ticket.addClass("is-bump");
  }

  function onInput() {
    clearTimeout(debounceTimer);
    var raw = $("#unitsInput").val();

    debounceTimer = setTimeout(function () {
      if (raw === "" || raw === null) {
        spinTo(0, 0);
        updateTicket({ units: 0, total: 0, slabs: emptySlabs() });
        $("#formHint").removeClass("is-error")
          .text("Registers react as you type — no need to press anything.");
        return;
      }
      var units = parseFloat(raw);
      if (isNaN(units) || units < 0) {
        $("#formHint").addClass("is-error").text("Units must be a number of 0 or more.");
        return;
      }
      requestBill(Math.min(Math.floor(units), 99999));
    }, 280);
  }

  function emptySlabs() {
    return [
      { label: "First 50 units",  rate: 3.5, units: 0, cost: 0 },
      { label: "Next 100 units",  rate: 4.0, units: 0, cost: 0 },
      { label: "Next 100 units",  rate: 5.2, units: 0, cost: 0 },
      { label: "Above 250 units", rate: 6.5, units: 0, cost: 0 }
    ];
  }

  $("#unitsInput").on("input", onInput);

  // The button still works (and is the no-JS fallback) — with JS we
  // just force an immediate calculation instead of a page reload.
  $("#billForm").on("submit", function (e) {
    e.preventDefault();
    clearTimeout(debounceTimer);
    var units = parseFloat($("#unitsInput").val());
    if (isNaN(units) || units < 0) { units = 0; }
    requestBill(Math.min(Math.floor(units), 99999));
  });

  /* server-rendered POST result (no-JS submit, then JS loaded):
     roll the registers up from zero to the rendered value. */
  (function bootFromServer() {
    var u = parseFloat($("#odoUnits").data("value")) || 0;
    var a = parseFloat($("#odoAmount").data("value")) || 0;
    renderAll();
    if (u > 0 || a > 0) {
      setTimeout(function () { spinTo(u, a); }, 500);
    }
  })();

  /* ==========================================================
     MOBILE LIQUID CIRCLE -> CARD
     ========================================================== */

  var $mobnav = $("#mobnav");

  $("#mobnavToggle").on("click", function () {
    var open = $mobnav.toggleClass("open").hasClass("open");
    $(this).attr("aria-expanded", open ? "true" : "false");
  });

  $(document).on("click", function (e) {
    if ($mobnav.hasClass("open") && !$(e.target).closest("#mobnav").length) {
      $mobnav.removeClass("open");
      $("#mobnavToggle").attr("aria-expanded", "false");
    }
  });

  $(".mobnav-link").on("click", function () {
    $mobnav.removeClass("open");
    $("#mobnavToggle").attr("aria-expanded", "false");
  });

  /* ==========================================================
     NAV — active link tracking + tuck on scroll
     ========================================================== */

  var sections = $("section[id], footer[id]");

  $(window).on("scroll", function () {
    var y = $(this).scrollTop();
    $("#pillnav").toggleClass("is-tucked", y > 40);

    var current = "";
    sections.each(function () {
      if (y >= $(this).offset().top - 220) { current = this.id; }
    });
    $(".navlink").removeClass("is-active")
      .filter('[href="#' + current + '"]').addClass("is-active");
  });

  /* ==========================================================
     SCROLL REVEAL
     ========================================================== */

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  $(".reveal").each(function (i) {
    this.style.transitionDelay = (i % 6) * 60 + "ms";
    observer.observe(this);
  });

});

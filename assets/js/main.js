// Gold Sheen Sapphire — shared site behaviour
// Vanilla JS on purpose: no build step, no third-party runtime dependency.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Image fade-in on load ---------- */
  document.querySelectorAll("main img").forEach(function (img) {
    var markLoaded = function () {
      img.classList.add("is-loaded");
    };
    if (img.complete) {
      markLoaded();
    } else {
      img.addEventListener("load", markLoaded);
      img.addEventListener("error", markLoaded);
    }
  });

  /* ---------- Nav scroll state ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Gold scroll progress bar ---------- */
  var progress = document.querySelector(".scroll-progress");
  if (progress) {
    var updateProgress = function () {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.width = pct + "%";
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileMenu = document.querySelector(".mobile-menu");
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- Scroll reveal (fades in on enter, fades out on leave) ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) {
        el.classList.add("is-visible");
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var delay = entry.target.getAttribute("data-reveal-delay") || 0;
              entry.target.style.transitionDelay = delay + "ms";
              entry.target.classList.add("is-visible");
            } else {
              entry.target.style.transitionDelay = "0ms";
              entry.target.classList.remove("is-visible");
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
      );
      revealEls.forEach(function (el) {
        io.observe(el);
      });
    }
  }

  /* ---------- Subtle hero parallax (layered image movement) ---------- */
  var collage = document.querySelector(".hero-collage");
  if (collage && !reduceMotion) {
    var layers = collage.querySelectorAll("[data-parallax]");
    var ticking = false;

    var apply = function () {
      var rect = collage.getBoundingClientRect();
      var progress = 1 - Math.min(Math.max(rect.top / window.innerHeight, -1), 1);
      layers.forEach(function (layer) {
        var speed = parseFloat(layer.getAttribute("data-parallax")) || 0.1;
        var y = (progress - 0.5) * 60 * speed;
        layer.style.transform = "translate3d(0, " + y.toFixed(1) + "px, 0)";
      });
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(apply);
          ticking = true;
        }
      },
      { passive: true }
    );
    apply();
  }

  /* ---------- Marquee: duplicate content for a seamless loop ---------- */
  document.querySelectorAll(".marquee-track").forEach(function (track) {
    if (track.dataset.doubled) return;
    track.insertAdjacentHTML("beforeend", track.innerHTML);
    track.dataset.doubled = "true";
  });

  /* ---------- Contact form (Web3Forms, with mailto fallback) ---------- */
  var form = document.querySelector("#contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var submitBtn = form.querySelector('button[type="submit"]');
      var name = form.querySelector("#name");
      var email = form.querySelector("#email");
      var message = form.querySelector("#message");
      var accessKeyField = form.querySelector('input[name="access_key"]');
      var mailFallback = form.getAttribute("data-mailto-fallback");

      if (!name.value || !email.value || !message.value) {
        if (status) {
          status.textContent = "Please fill in your name, email, and message.";
          status.classList.add("is-error");
        }
        return;
      }

      // Access key not configured yet — fall back to mailto so the form still works.
      if (!accessKeyField || accessKeyField.value === "YOUR_WEB3FORMS_ACCESS_KEY") {
        var subject = encodeURIComponent("Inquiry from " + name.value);
        var body = encodeURIComponent(message.value + "\n\n" + name.value + "\n" + email.value);
        window.location.href = mailFallback + "?subject=" + subject + "&body=" + body;
        if (status) {
          status.classList.remove("is-error");
          status.textContent = "Opening your email client to send this inquiry… (Web3Forms access key not set yet.)";
        }
        return;
      }

      if (status) {
        status.classList.remove("is-error");
        status.textContent = "Sending…";
      }
      if (submitBtn) submitBtn.disabled = true;

      var payload = Object.fromEntries(new FormData(form));

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          return response.json().then(function (data) {
            return { ok: response.ok, data: data };
          });
        })
        .then(function (result) {
          if (result.ok && result.data.success) {
            if (status) {
              status.classList.remove("is-error");
              status.textContent = "Thank you — your inquiry has been sent. We'll reply within one to two business days.";
            }
            form.reset();
          } else {
            throw new Error((result.data && result.data.message) || "Submission failed");
          }
        })
        .catch(function () {
          if (status) {
            status.classList.add("is-error");
            status.textContent = "Something went wrong sending that. Please email us directly at genuinegems08@gmail.com.";
          }
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ---------- Current year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();

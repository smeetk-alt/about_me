// navigation.js — shared across all pages

const pages = [
    { label: 'Home', href: 'index.html' },
    { label: 'About', href: 'about.html' },
    { label: 'Experience', href: 'experience.html' },
    { label: 'Projects', href: 'projects.html' },
    { label: 'Skills', href: 'skills.html' },
    { label: 'Contact', href: 'contact.html' },
];

function buildNav() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const nav = document.createElement('nav');

    // Logo
    const logo = document.createElement('a');
    logo.href = 'index.html';
    logo.className = 'logo';
    logo.textContent = 'SK';
    nav.appendChild(logo);

    // Desktop links
    const links = document.createElement('div');
    links.className = 'nav-links';
    pages.forEach(p => {
        const a = document.createElement('a');
        a.href = p.href;
        a.textContent = p.label;
        if (p.href === currentPage) a.classList.add('active');
        links.appendChild(a);
    });
    nav.appendChild(links);

    // Hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';
    nav.appendChild(hamburger);

    // Mobile menu overlay
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-menu';
    pages.forEach(p => {
        const a = document.createElement('a');
        a.href = p.href;
        a.textContent = p.label;
        if (p.href === currentPage) a.classList.add('active');
        mobileMenu.appendChild(a);
    });

    document.body.prepend(mobileMenu);
    document.body.prepend(nav);

    // Toggle logic
    hamburger.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            hamburger.classList.remove('open');
            document.body.style.overflow = '';
        });
    });
}

// Footer year
function buildFooter() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

buildNav();
buildFooter();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
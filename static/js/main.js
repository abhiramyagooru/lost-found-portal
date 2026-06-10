// Theme Toggle
document.addEventListener('DOMContentLoaded', function() {
    // Theme Management
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('i');
    
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-bs-theme', savedTheme);
        
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
        }
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            if (themeIcon) {
                themeIcon.className = newTheme === 'dark' ? 'bi bi-sun' : 'bi bi-moon';
            }
            
            // Show theme change notification
            showToast(`Switched to ${newTheme} mode`, 'success');
        });
    }
    
    // Initialize theme
    initTheme();
    
    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Image preview for forms
    const imageInputs = document.querySelectorAll('input[type="file"][accept*="image"]');
    imageInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const previewId = this.dataset.preview || 'imagePreview';
            const preview = document.getElementById(previewId);
            
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    preview.src = e.target.result;
                    preview.classList.remove('d-none');
                    preview.classList.add('fade-in-up');
                }
                
                reader.readAsDataURL(this.files[0]);
            }
        });
    });
    
    // Collect place modal functionality
    const collectOptions = document.querySelectorAll('.collect-option');
    collectOptions.forEach(option => {
        option.addEventListener('click', function() {
            const value = this.textContent.trim();
            const input = document.getElementById('collect_place');
            
            if (input) {
                input.value = value;
                
                // Add visual feedback
                this.classList.add('btn-primary');
                this.classList.remove('btn-outline-primary');
                
                // Reset other buttons
                collectOptions.forEach(btn => {
                    if (btn !== this) {
                        btn.classList.remove('btn-primary');
                        btn.classList.add('btn-outline-primary');
                    }
                });
                
                // Close modal after delay
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('collectModal'));
                    if (modal) modal.hide();
                }, 500);
            }
        });
    });
    
    // Autocomplete search
    const searchInput = document.getElementById('searchInput');
    const suggestionsBox = document.getElementById('suggestions');
    
    if (searchInput && suggestionsBox) {
        let timeoutId;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(timeoutId);
            
            const query = this.value.trim();
            if (query.length < 2) {
                suggestionsBox.classList.add('d-none');
                return;
            }
            
            timeoutId = setTimeout(() => {
                fetch('/autocomplete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({ keyword: query })
                })
                .then(response => response.json())
                .then(suggestions => {
                    suggestionsBox.innerHTML = '';
                    
                    if (suggestions.length === 0) {
                        suggestionsBox.classList.add('d-none');
                        return;
                    }
                    
                    suggestions.forEach(suggestion => {
                        const div = document.createElement('div');
                        div.className = 'suggestion-item';
                        div.textContent = suggestion;
                        
                        div.addEventListener('click', function() {
                            searchInput.value = suggestion;
                            suggestionsBox.classList.add('d-none');
                            searchInput.focus();
                        });
                        
                        suggestionsBox.appendChild(div);
                    });
                    
                    suggestionsBox.classList.remove('d-none');
                })
                .catch(error => {
                    console.error('Autocomplete error:', error);
                    suggestionsBox.classList.add('d-none');
                });
            }, 300);
        });
        
        // Hide suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
                suggestionsBox.classList.add('d-none');
            }
        });
        
        // Keyboard navigation for suggestions
        searchInput.addEventListener('keydown', function(e) {
            const items = suggestionsBox.querySelectorAll('.suggestion-item');
            let activeItem = suggestionsBox.querySelector('.suggestion-item.active');
            
            if (items.length === 0) return;
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                
                if (!activeItem) {
                    items[0].classList.add('active');
                } else {
                    activeItem.classList.remove('active');
                    const next = activeItem.nextElementSibling || items[0];
                    next.classList.add('active');
                    searchInput.value = next.textContent;
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                
                if (!activeItem) {
                    items[items.length - 1].classList.add('active');
                    searchInput.value = items[items.length - 1].textContent;
                } else {
                    activeItem.classList.remove('active');
                    const prev = activeItem.previousElementSibling || items[items.length - 1];
                    prev.classList.add('active');
                    searchInput.value = prev.textContent;
                }
            } else if (e.key === 'Enter' && activeItem) {
                e.preventDefault();
                searchInput.value = activeItem.textContent;
                suggestionsBox.classList.add('d-none');
                searchInput.form?.submit();
            }
        });
    }
    
    // Form validation enhancements
    const forms = document.querySelectorAll('form[novalidate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
                
                // Add Bootstrap validation styles
                this.classList.add('was-validated');
                
                // Scroll to first error
                const firstInvalid = this.querySelector(':invalid');
                if (firstInvalid) {
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    firstInvalid.focus();
                }
            }
        });
    });
    
    // Add fade-in animation to cards
    const cards = document.querySelectorAll('.item-card, .neumorphic-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in-up');
    });
    
    // Show welcome message on first visit
    if (!localStorage.getItem('welcomeShown')) {
        setTimeout(() => {
            showToast('Welcome to Lost & Found Portal! 👋', 'info');
            localStorage.setItem('welcomeShown', 'true');
        }, 1000);
    }
});

// Utility function to show toast notifications
function showToast(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.addEventListener('mouseenter', Swal.stopTimer);
                toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
        });
        
        Toast.fire({
            icon: type,
            title: message
        });
    }
}

// Confirm before marking as collected
function confirmCollection(form) {
    Swal.fire({
        title: 'Mark as Collected?',
        text: "This will permanently remove the item from the system.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#4361ee',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, mark as collected',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            form.submit();
        }
    });
    return false;
}

// Show loading overlay
function showLoading() {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loader-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}
// File: fix-issues.js
(function() {
    console.log('🔧 Applying fixes for GitHub sync and popup issues...');
    
    // Fix 1: Override showPopup để đảm bảo popup hiển thị đúng
    const originalShowPopup = window.showPopup;
    window.showPopup = function(html) {
        console.log('🔄 Fixed showPopup called');
        
        // Close existing popups
        const existing = document.querySelectorAll('.popup-overlay, .popup-container');
        existing.forEach(el => el.remove());
        
        // Create new overlay
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay fixed-overlay';
        overlay.innerHTML = html;
        
        // Add to body
        document.body.appendChild(overlay);
        
        // Show after delay
        setTimeout(() => {
            overlay.classList.add('active');
            
            // Focus first input
            const firstInput = overlay.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        }, 50);
        
        // Add close on click outside
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closePopup();
            }
        });
    };
    
    // Fix 2: Override closePopup
    window.closePopup = function() {
        console.log('🔄 Fixed closePopup called');
        const popups = document.querySelectorAll('.popup-overlay, .popup-container');
        popups.forEach(popup => {
            popup.classList.remove('active');
            setTimeout(() => popup.remove(), 300);
        });
    };
    
    // Fix 3: Thêm CSS fixes trực tiếp
    const style = document.createElement('style');
    style.id = 'fix-styles';
    style.textContent = `
        /* Force highest z-index for popups */
        .popup-overlay, .fixed-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background: rgba(0,0,0,0.8) !important;
            z-index: 999999 !important;
            display: none !important;
            justify-content: center !important;
            align-items: center !important;
            opacity: 0 !important;
            transition: opacity 0.3s !important;
        }
        
        .popup-overlay.active, .fixed-overlay.active {
            display: flex !important;
            opacity: 1 !important;
        }
        
        .popup {
            z-index: 1000000 !important;
            background: white !important;
            border-radius: 12px !important;
            padding: 30px !important;
            max-width: 600px !important;
            width: 90% !important;
            max-height: 85vh !important;
            overflow-y: auto !important;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4) !important;
            animation: popupAppear 0.3s ease-out !important;
        }
        
        @keyframes popupAppear {
            from {
                transform: translateY(-40px) scale(0.9);
                opacity: 0;
            }
            to {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
        }
        
        /* Ensure body doesn't scroll when popup is open */
        body.popup-open {
            overflow: hidden !important;
        }
    `;
    
    document.head.appendChild(style);
    
    // Fix 4: Add button để test GitHub settings
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            const settingsTab = document.getElementById('settings');
            if (settingsTab) {
                // Thêm test button vào settings tab
                settingsTab.addEventListener('click', function(e) {
                    if (e.target && e.target.textContent.includes('Mở Popup GitHub')) {
                        e.preventDefault();
                        console.log('Testing GitHub popup...');
                        if (typeof showGitHubSettingsPopup === 'function') {
                            showGitHubSettingsPopup();
                        }
                    }
                });
            }
        }, 2000);
    });
    
    console.log('✅ All fixes applied successfully');
})();
<script setup>
    import { onMounted } from 'vue'
    function updateBg(url) {
        document.documentElement.style.setProperty('--background', 'url(' + url + ')');
    }
    onMounted(async () => {
        const settingsUrl = 'background';
        const settingsBgDate = 'backgroundDate';
        const bgUrl = localStorage.getItem(settingsUrl);
        const bgDate = localStorage.getItem(settingsBgDate);
        const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        if(bgUrl === null || bgDate !== currentDate)
            fetch('https://bing.biturl.top/')
                .then(response => response.json())
                .then(data => {
                    updateBg(data.url);
                    localStorage.setItem(settingsUrl, data.url);
                    localStorage.setItem(settingsBgDate, currentDate);
                });
        else updateBg(bgUrl);
    })
</script>
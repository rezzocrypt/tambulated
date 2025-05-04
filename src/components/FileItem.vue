<template>
    <a class="link" href="#">
        <div class="element">
            <div class="icon" :style="icon != null ? `background: ${icon}`:''"></div>
            <p class="label">{{ name }}</p>
            <slot />
        </div>
    </a>
</template>

<style scoped>
.link {
    text-decoration: none !important;
    border-radius: 5px;
    color: lightgray;
    font-size: 10px;
    text-align: center;
    padding: 5px;
    max-width: 60px;
}

.link:hover {
    background: transparent;
    color: white;
}

.label {
    text-overflow: ellipsis;
    overflow: hidden;
}

.icon {
    width: 50px;
    height: 50px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: 50% calc(50% + 2px);
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABCUlEQVR4nO2VMWrDQBBFp8gRQhoFV5a0pM0Zci/fRAK7CcJd0gXcRfKALxFIZ4OdA+gbxZ1A3nU1A/4Pfv/f7OyuCCGEEDICS3lGJQ1q+UMtSEolC3FTvpZDcnFvErhM/vbyXiRwy9p4lMBQYPUAfGVAVwAabNMVPTazX3w+vaUJDOXb3L64jtLmPT4eX+MCw+Sty+pENrOfuICHtdGpUyj6uIB1Sb0eCoAnELhCV7FeEfASq/2UwWdU7ScNfmTqMxLDuiAooPZTBldI7ScNXmL1GbmHZ/RkXRJT2YZjXGBbrh0LNAkCoYCWe/OyOk55wO5lHhX4l/jOM2h4d7JOp2HyyeUJIYTcFWcLXG7i+rfwxwAAAABJRU5ErkJggg==);
}

</style>

<script>
export default {
    name: 'file-item',
    props: {
        name: { type: String, required: true },
        icon: { type: String },
        url: { type: String },
        childs: { type: Array }
    },
    data() {
        return {};
    },
    methods: {},
}
</script>
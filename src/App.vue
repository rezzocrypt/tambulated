<template>
  <nav>
    <router-link :to="{ name: 'home' }">Home</router-link>
    <router-link to="/about">About</router-link>
  </nav>
  <router-view />
</template>
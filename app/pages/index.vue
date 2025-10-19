<script setup lang="ts">
const user = useUser();
</script>

<template>
    <h2>Index page</h2>
    <h3 v-if="user.isLoggedIn">You are logged in</h3>
    <h3 v-else>You are logged out</h3>
</template>
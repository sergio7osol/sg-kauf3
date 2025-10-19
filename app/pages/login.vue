<script setup lang="ts">
const user = useUser();
</script>

<template>
    <h2>Login page</h2>
    <nav>
        <ul>
            <li>
                <NuxtLink to="/">Dashboard</NuxtLink>
            </li>
        </ul>
    </nav>
    <main>
        <form @submit.prevent="user.login">
            <input type="text" placeholder="Username" />
            <input type="password" placeholder="Password" />
            <button type="submit">Login</button>
        </form>
    </main>
</template>
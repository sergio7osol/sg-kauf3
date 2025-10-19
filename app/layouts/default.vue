<script setup lang="ts">
const user = useUser();
</script>

<template>
  <div>
    <nav>
      <ul>
        <li>
          <NuxtLink to="/">Home</NuxtLink>
        </li>
        <li>
          <NuxtLink v-if="user.isLoggedIn" to="/admin">Admin</NuxtLink>
        </li>
        <li>
          <NuxtLink v-if="!user.isLoggedIn" to="/login">Login</NuxtLink>
          <NuxtLink v-else to="/login" @click="user.logout">Log out</NuxtLink>
        </li>
      </ul>
    </nav>
    <main>
      <slot />
    </main>
    <footer>
      <p>Footer</p>
    </footer>
  </div>
</template>
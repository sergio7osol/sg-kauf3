<script setup>
import axios from "axios"

await axios.post("/logout");
useRouter().replace("/login");
</script>

<template>
  <div class="p-4 text-center text-lg font-medium">Logging Out...</div>
</template>

<script>
  import { pop } from "svelte-spa-router";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<h1 class="back-button" on:click={() => pop()}>CRASHED 😭</h1>

<style>
    .back-button {
        transition: transform 0.3s;
        position: absolute;
        font-size: 20px;
        color: #e8e8e8;
        text-shadow: 2px 2px #7a7777;
        font-family: 'Press Start 2P', serif;
        cursor: pointer;
    }

    .back-button:hover {
        transform: scale(1.2);
    }
</style>

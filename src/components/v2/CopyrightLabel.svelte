<script>
  import { preventSelection } from "../../utils/svelteUtils.js";
</script>


<div on:selectstart={preventSelection}
     on:mousedown={preventSelection} class="copyright">
  © 2000-{new Date().getFullYear()} HGLabor/Friends Inc. v0.5.2
</div>

<style>
    .copyright {
        font-family: 'Press Start 2P', serif;
        font-size: 10px;
        margin-top: 0.3em;
        text-shadow: 1px 1px var(--hover-color-text-shadow);
        color: var(--hover-color);
        cursor: default;
    }
</style>

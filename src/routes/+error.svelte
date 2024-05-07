<script>
	import '$lib/error_style.css';
	import { page } from '$app/stores';
</script>

<img src="/logo.svg" alt="HAKUMI Logo" height="56">
<h2>oh dear, something went wrong!</h2>
<p>HTTP {$page.status} — {$page.error?.message}</p>

<p>
	<a href="https://hakumi.cafe">Return to home</a>
	•
	<a href="https://discord.com/invite/rs3r4dQu9P">Get support</a>
</p>
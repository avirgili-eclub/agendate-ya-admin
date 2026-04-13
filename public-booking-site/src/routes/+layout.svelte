<script lang="ts">
  import PublicFooter from "../lib/components/layout/public-footer.svelte";
  import PublicHeader from "../lib/components/layout/public-header.svelte";

  export let data: {
    bookingConfig: {
      tenantName: string;
      branding: {
        primaryColor: string;
        secondaryColor: string;
        accentColor: string;
        backgroundColor: string;
        surfaceColor: string;
        textColor: string;
        textSecondaryColor: string;
        borderRadius: string;
        fontFamily: string;
        logoUrl: string | null;
      };
    };
  };

  const branding = data.bookingConfig.branding;
</script>

<div
  style:--primary={branding.primaryColor}
  style:--secondary={branding.secondaryColor}
  style:--accent={branding.accentColor}
  style:--background={branding.backgroundColor}
  style:--surface={branding.surfaceColor}
  style:--text={branding.textColor}
  style:--text-secondary={branding.textSecondaryColor}
  style:--radius={branding.borderRadius}
  style:font-family={branding.fontFamily}
  class="min-h-screen"
>
  <PublicHeader
    tenantName={data.bookingConfig.tenantName}
    logoUrl={branding.logoUrl}
  />
  <slot />
  <PublicFooter />
</div>

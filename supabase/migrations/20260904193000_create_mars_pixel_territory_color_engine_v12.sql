begin;

alter table public.mars_pixel_allocations
  add column if not exists color_key text;

alter table public.mars_pixel_allocations
  drop constraint if exists mars_pixel_allocations_color_key_v12;

alter table public.mars_pixel_allocations
  add constraint mars_pixel_allocations_color_key_v12
  check (
    color_key is null
    or color_key in (
      'RAINBOW_01',
      'RAINBOW_02',
      'RAINBOW_03',
      'RAINBOW_04',
      'RAINBOW_05',
      'RAINBOW_06',
      'RAINBOW_07',
      'RAINBOW_08',
      'RAINBOW_09',
      'RAINBOW_10',
      'RAINBOW_11',
      'RAINBOW_12',
      'RAINBOW_13',
      'RAINBOW_14',
      'RAINBOW_15',
      'RAINBOW_16',
      'RAINBOW_17',
      'RAINBOW_18',
      'RAINBOW_19',
      'RAINBOW_20'
    )
  );

comment on column public.mars_pixel_allocations.color_key is
'Stable Mars Pixel territory palette key. Adjacent owned territories sharing a direct edge must use different colors.';

create or replace function public.get_mars_pixel_territory_color_options_v1(
  p_x_start integer,
  p_y_start integer,
  p_width integer,
  p_height integer
)
returns table (
  color_key text,
  allowed boolean,
  adjacent boolean,
  usage_count bigint,
  auto_rank integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grid_version integer;
  v_grid_width integer;
  v_grid_height integer;
begin
  select
    config.grid_version,
    config.grid_width,
    config.grid_height
  into
    v_grid_version,
    v_grid_width,
    v_grid_height
  from public.mars_pixel_network_config as config
  where config.id = 1;

  if not found then
    raise exception 'MARS_PIXEL_NETWORK_CONFIG_MISSING'
      using errcode = '55000';
  end if;

  if p_width is null
     or p_height is null
     or p_width < 1
     or p_height < 1 then
    raise exception 'MARS_PIXEL_INVALID_TERRITORY_SIZE'
      using errcode = '22023';
  end if;

  if p_x_start < 0
     or p_y_start < 0
     or p_x_start + p_width > v_grid_width
     or p_y_start + p_height > v_grid_height then
    raise exception 'MARS_PIXEL_TERRITORY_OUT_OF_BOUNDS'
      using errcode = '22023';
  end if;

  return query
  with palette(color_key, palette_order) as (
    values
      ('RAINBOW_01', 1),
      ('RAINBOW_02', 2),
      ('RAINBOW_03', 3),
      ('RAINBOW_04', 4),
      ('RAINBOW_05', 5),
      ('RAINBOW_06', 6),
      ('RAINBOW_07', 7),
      ('RAINBOW_08', 8),
      ('RAINBOW_09', 9),
      ('RAINBOW_10', 10),
      ('RAINBOW_11', 11),
      ('RAINBOW_12', 12),
      ('RAINBOW_13', 13),
      ('RAINBOW_14', 14),
      ('RAINBOW_15', 15),
      ('RAINBOW_16', 16),
      ('RAINBOW_17', 17),
      ('RAINBOW_18', 18),
      ('RAINBOW_19', 19),
      ('RAINBOW_20', 20)
  ),
  adjacent_colors as (
    select distinct allocation.color_key
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and allocation.color_key is not null
      and (
        (
          allocation.x_start + allocation.width = p_x_start
          or p_x_start + p_width = allocation.x_start
        )
        and allocation.y_start < p_y_start + p_height
        and allocation.y_start + allocation.height > p_y_start
        or
        (
          allocation.y_start + allocation.height = p_y_start
          or p_y_start + p_height = allocation.y_start
        )
        and allocation.x_start < p_x_start + p_width
        and allocation.x_start + allocation.width > p_x_start
      )
  ),
  usage as (
    select
      allocation.color_key,
      count(*)::bigint as usage_count
    from public.mars_pixel_allocations as allocation
    where allocation.grid_version = v_grid_version
      and allocation.allocation_status = 'owned'
      and allocation.color_key is not null
    group by allocation.color_key
  ),
  ranked as (
    select
      palette.color_key,
      adjacent_colors.color_key is null as allowed,
      adjacent_colors.color_key is not null as adjacent,
      coalesce(usage.usage_count, 0)::bigint as usage_count,
      row_number() over (
        order by
          case
            when adjacent_colors.color_key is null then 0
            else 1
          end,
          coalesce(usage.usage_count, 0),
          palette.palette_order
      )::integer as auto_rank
    from palette
    left join adjacent_colors
      on adjacent_colors.color_key = palette.color_key
    left join usage
      on usage.color_key = palette.color_key
  )
  select
    ranked.color_key,
    ranked.allowed,
    ranked.adjacent,
    ranked.usage_count,
    ranked.auto_rank
  from ranked
  order by ranked.auto_rank;
end;
$$;

revoke all on function public.get_mars_pixel_territory_color_options_v1(
  integer,
  integer,
  integer,
  integer
) from public;

grant execute on function public.get_mars_pixel_territory_color_options_v1(
  integer,
  integer,
  integer,
  integer
) to anon, authenticated;

commit;

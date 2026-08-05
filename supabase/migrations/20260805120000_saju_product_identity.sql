-- 사주 프로그램 대표 이미지와 공식 상품명을 통일한다.

BEGIN;

UPDATE admin_products
SET
  name = '사주 분석 퍼퓸&디퓨저 클리커 키링',
  updated_at = NOW()
WHERE slug = 'saju';

DO $$
DECLARE
  target_image_id admin_product_images.id%TYPE;
BEGIN
  -- 이미 지정 사진이 있으면 그 행을, 없으면 기존 대표 이미지 행을 재사용한다.
  SELECT id
  INTO target_image_id
  FROM admin_product_images
  WHERE product_slug = 'saju'
  ORDER BY
    CASE
      WHEN image_url = '/images/product-detail/saju-lineup-square.png' THEN 0
      ELSE 1
    END,
    display_order ASC,
    created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF target_image_id IS NULL THEN
    INSERT INTO admin_product_images (
      product_slug,
      image_url,
      image_type,
      display_order,
      alt_text
    )
    VALUES (
      'saju',
      '/images/product-detail/saju-lineup-square.png',
      'gallery',
      0,
      '사주 분석 퍼퓸&디퓨저 클리커 키링 라인업'
    )
    RETURNING id INTO target_image_id;
  ELSE
    UPDATE admin_product_images
    SET
      image_url = '/images/product-detail/saju-lineup-square.png',
      image_type = 'gallery',
      display_order = 0,
      alt_text = '사주 분석 퍼퓸&디퓨저 클리커 키링 라인업',
      updated_at = NOW()
    WHERE id = target_image_id;
  END IF;

  -- 대표 이미지 외 행은 기존 순서를 보존하면서 1번부터 정렬한다.
  WITH ordered_images AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY display_order ASC, created_at ASC)::integer AS next_order
    FROM admin_product_images
    WHERE product_slug = 'saju'
      AND id <> target_image_id
  )
  UPDATE admin_product_images AS image
  SET
    display_order = ordered_images.next_order,
    updated_at = NOW()
  FROM ordered_images
  WHERE image.id = ordered_images.id;
END
$$;

COMMIT;

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';

/**
 * ทดสอบแบบยิง HTTP จริงผ่านทั้งแอป ต้องมี api/.env และฐานข้อมูลที่รันอยู่
 * (ใช้แค่อ่าน ไม่เขียนข้อมูลใด ๆ)
 */
describe('Learnora API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // ตั้งค่าแบบเดียวกับ main.ts
    app = moduleFixture.createNestApplication({ rawBody: true });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /courses returns the public catalog without logging in', async () => {
    const response = await request(app.getHttpServer())
      .get('/courses')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        courses: expect.any(Array) as unknown,
        total: expect.any(Number) as unknown,
        page: 1,
      }),
    );
  });

  it('GET /instructors/:id rejects an id that is not a UUID', () => {
    return request(app.getHttpServer())
      .get('/instructors/not-a-uuid')
      .expect(400);
  });

  it('GET /instructors/:id returns 404 for an unknown instructor', () => {
    return request(app.getHttpServer())
      .get(`/instructors/${randomUUID()}`)
      .expect(404);
  });

  it('protected routes require a token', () => {
    return request(app.getHttpServer()).get('/cart').expect(401);
  });

  it.each([
    ['get', '/instructor/earnings'],
    ['put', '/instructor/earnings/account'],
    ['get', '/admin/payouts'],
    ['post', '/admin/payouts'],
  ] as const)('%s %s (payouts) requires a token', (method, path) => {
    return request(app.getHttpServer())[method](path).expect(401);
  });
});

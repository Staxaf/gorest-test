const request = require('supertest');
const { expect } = require('chai');
require('dotenv').config({ quiet: true });

const API_URL = 'https://gorest.co.in';

function expectPagination(response) {
  expect(response.headers['x-pagination-page']).to.be.a('string');
  expect(response.headers['x-pagination-limit']).to.be.a('string');
  expect(response.headers['x-pagination-total']).to.be.a('string');
}

describe('GoREST API', function () {
  this.timeout(20000);

  const token = process.env.GOREST_TOKEN;
  let createdUser;
  let createdPost;

  it('GET /public/v2/users returns a list of users', async function () {
    const response = await request(API_URL)
      .get('/public/v2/users')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).to.be.an('array').with.lengthOf.above(0);

    const user = response.body[0];
    expect(user.id).to.be.a('number');
    expect(user.name).to.be.a('string');
    expect(user.email).to.be.a('string');
    expect(user.gender).to.match(/^(male|female)$/);
    expect(user.status).to.match(/^(active|inactive)$/);

    expectPagination(response);
  });

  it('GET /public/v2/todos returns a list of todos', async function () {
    const response = await request(API_URL)
      .get('/public/v2/todos')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).to.be.an('array').with.lengthOf.above(0);

    const todo = response.body[0];
    expect(todo.id).to.be.a('number');
    expect(todo.user_id).to.be.a('number');
    expect(todo.title).to.be.a('string');
    expect(todo.due_on).to.match(/^\d{4}-\d{2}-\d{2}T/);
    expect(todo.status).to.match(/^(pending|completed)$/);

    expectPagination(response);
  });

  it('POST /public/v2/users creates a user', async function () {
    expect(token).to.be.a('string').and.not.empty;

    const payload = {
      name: 'Anton Test',
      email: `anton.test.${Date.now()}@example.com`,
      gender: 'male',
      status: 'active',
    };

    const response = await request(API_URL)
      .post('/public/v2/users')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.id).to.be.a('number');
    expect(response.body).to.include({
      name: payload.name,
      email: payload.email,
      gender: payload.gender,
      status: payload.status,
    });

    createdUser = response.body;
  });

  it('PATCH /public/v2/users/:id updates the created user', async function () {
    expect(createdUser?.id).to.be.a('number');

    const updatedName = 'Anton Test Updated';

    const response = await request(API_URL)
      .patch(`/public/v2/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send({ name: updatedName })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).to.deep.equal({
      id: createdUser.id,
      name: updatedName,
      email: createdUser.email,
      gender: createdUser.gender,
      status: createdUser.status,
    });

    createdUser = response.body;
  });

  it('POST /public/v2/users/:id/posts creates a post for the user', async function () {
    expect(createdUser?.id).to.be.a('number');

    const payload = {
      title: 'Post from Anton',
      body: 'This post was created by the test user.',
    };

    const response = await request(API_URL)
      .post(`/public/v2/users/${createdUser.id}/posts`)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.id).to.be.a('number');
    expect(response.body).to.include({
      user_id: createdUser.id,
      title: payload.title,
      body: payload.body,
    });

    createdPost = response.body;
  });

  it('POST /public/v2/posts/:id/comments creates a comment on the post', async function () {
    expect(createdPost?.id).to.be.a('number');

    const payload = {
      name: createdUser.name,
      email: createdUser.email,
      body: 'A comment on the user post.',
    };

    const response = await request(API_URL)
      .post(`/public/v2/posts/${createdPost.id}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .send(payload)
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.id).to.be.a('number');
    expect(response.body).to.include({
      post_id: createdPost.id,
      name: payload.name,
      email: payload.email,
      body: payload.body,
    });
  });

  it("GET /public/v2/users/:id/posts returns only that user's posts", async function () {
    expect(createdUser?.id).to.be.a('number');
    expect(createdPost?.id).to.be.a('number');

    const response = await request(API_URL)
      .get(`/public/v2/users/${createdUser.id}/posts`)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).to.deep.equal([createdPost]);
    expectPagination(response);
  });

  it('DELETE /public/v2/users/:id deletes the created user', async function () {
    expect(createdUser?.id).to.be.a('number');

    await request(API_URL)
      .delete(`/public/v2/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(API_URL)
      .get(`/public/v2/users/${createdUser.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'application/json')
      .expect(404);
  });
});
